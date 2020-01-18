// Apple Pencil demo using Pressure.js

// Alternative method: https://github.com/quietshu/apple-pencil-safari-api-test

// If you want to go deeper into pointer events
// https://patrickhlauke.github.io/touch/
// https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/pressure

// Next: smooth curves:
// https://forum.processing.org/two/discussion/17249/smooth-curves-from-series-of-x-y-co-ordinates
// https://p5js.org/reference/#/p5/curvePoint

// The two and three fingers tap detection with Hammer.js seem very unreliable
// Could it be that detecting events on Document.body is not the right way to go?
// or maybe Pressure.js and Hammer.js don't play well together?
//
// Explanation: when starting a 3 finger and lifting a finger the 2 finger tap kicks in right away.
// Solution: Use http://hammerjs.github.io/toggle-recognizer/ to disable the 2 finger tap when you get 3 finger tap start then re-enable it on 3 finger tap end
// Source: https://github.com/hammerjs/hammer.js/issues/1021
// Might not work either as there is not tap end event: https://github.com/hammerjs/hammer.js/issues/1081

//

/***********************
 *       SETTINGS       *
 ************************/

// How sensitive is the brush size to the pressure of the pen?
var pressureMultiplier = 10;

// What is the smallest size for the brush?
var minBrushSize = 1;

// Higher numbers give a smoother stroke
var curvePointDensity = 20;
var linearPointDensity = 20;

var showDebug = true;

// Jitter smoothing parameters
// See: http://cristal.univ-lille.fr/~casiez/1euro/
var minCutoff = 0.0001; // decrease this to get rid of slow speed jitter but increase lag (must be > 0)
var beta = 1.0; // increase this to get rid of high speed lag

/***********************
 *       GLOBALS        *
 ************************/
var xFilter, yFilter, pFilter;
var steps;
var prevPenX = 0;
var prevPenY = 0;
var prevBrushSize = 1;
var amt, x, y, s, d;
var pressure = -1;
var drawCanvas, uiCanvas;
var isPressureInit = false;
var isDrawing = false;
var isDrawingJustStarted = false;
var hammertime;
var isTwoFingerTap = false;
var isThreeFingerTap = false;
var posVecBuffer = [];
var isOneEuroFilter = false; // use smoothing on the pen position

/***********************
 *    DRAWING CANVAS    *
 ************************/
new p5(function(p) {
  p.setup = function() {
    // Filters used to smooth position and pressure jitter
    xFilter = new OneEuroFilter(60, minCutoff, beta, 1.0);
    yFilter = new OneEuroFilter(60, minCutoff, beta, 1.0);
    pFilter = new OneEuroFilter(60, minCutoff, beta, 1.0);

    // prevent scrolling on iOS Safari
    disableScroll();

    //Initialize the canvas
    drawCanvas = p.createCanvas(p.windowWidth, p.windowHeight);
    drawCanvas.id("drawingCanvas");
    drawCanvas.position(0, 0);
  };

  p.draw = function() {
    // Start Pressure.js if it hasn't started already
    if (isPressureInit == false) {
      initPressure();
    }

    if (isDrawing) {
      penX = p.mouseX;
      penY = p.mouseY;

      if (isOneEuroFilter) {
        // Smooth out the position of the pointer
        penX = xFilter.filter(penX, p.millis());
        penY = yFilter.filter(penX, p.millis());
      }

      var v = [penX, penY];
      console.log(v);

      // What should we do on the first frame of the stroke?
      if (isDrawingJustStarted) {
        //console.log("started drawing");
        prevPenX = penX;
        prevPenY = penY;

        posVecBuffer.length = 0; // clear the array
        console.log("Empty array:", posVecBuffer);
        for (var i = 0; i < 4; i++) {
          console.log("filling the vector array");
          posVecBuffer.push(v);
          console.log(posVecBuffer);
        }
      }

      while (posVecBuffer.length >= 4) {
        // if the array is full (or above full)
        posVecBuffer.shift(); // remove one item from the beginning of the array
      }
      posVecBuffer.push(v); // add the latest position to the array

      // Smooth out the pressure
      pressure = pFilter.filter(pressure, p.millis());

      // Define the current brush size based on the pressure
      brushSize = minBrushSize + pressure * pressureMultiplier;

      // Calculate the distance between previous and current position
      d = p.dist(prevPenX, prevPenY, penX, penY);

      // The bigger the distance the more ellipses
      // will be drawn to fill in the empty space
      steps = (d / p.min(brushSize, prevBrushSize)) * curvePointDensity;

      // Add curvepoint ellipses to fill in the space
      // between samples of the pen position
      for (i = 1; i <= steps; i++) {
        amt = i / steps; // current position on the curve

        s = p.lerp(prevBrushSize, brushSize, amt);

        var xC = p.curvePoint(
          posVecBuffer[0][0],
          posVecBuffer[1][0],
          posVecBuffer[2][0],
          posVecBuffer[3][0],
          amt
        );

        var yC = p.curvePoint(
          posVecBuffer[0][1],
          posVecBuffer[1][1],
          posVecBuffer[2][1],
          posVecBuffer[3][1],
          amt
        );
        p.fill(100);
        p.ellipse(xC, yC, s);

        /*
        // PREMATURE OPTIMISATION IS THE ROOT OF ALL EVIL!!

        // add linear interpolation points (cheaper to calculate)
        // in between the smoothed points
        for (j = 0; j < posVecBuffer.length-1; j++) {
          var pX = posVecBuffer[j][1];
          var pY = posVecBuffer[j][2];
          var cX = posVecBuffer[j+1][1];
          var cY = posVecBuffer[j+1][1];

          var dL = p.dist(pX, pY, cX, cY);
          var linearSteps = (dL / s) * linearPointDensity;

          for(k = 0; k < linearSteps; j++){
            // Calculate the distance between previous and current position
            var a = k / linearSteps;
            var xL = p.lerp(pX, cX, a);
            var yL = p.lerp(pY, cY, a);
            p.noStroke();
            p.fill(0, 200, 20);
            p.ellipse(xL, yL, s);
          }
        }
        */
      }

      // Draw an ellipse at the latest position
      p.noStroke();
      p.fill(100);
      //p.ellipse(penX, penY, brushSize);

      // Save the latest brush values for next frame
      prevBrushSize = brushSize;
      prevPenX = penX;
      prevPenY = penY;

      isDrawingJustStarted = false;
    }
  };
}, "p5_instance_01");

/***********************
 *      UI CANVAS       *
 ************************/
new p5(function(p) {
  p.setup = function() {
    uiCanvas = p.createCanvas(p.windowWidth, p.windowHeight);
    uiCanvas.id("uiCanvas");
    uiCanvas.position(0, 0);
  };

  p.draw = function() {
    uiCanvas.clear();

    if (showDebug) {
      p.text("pressure = " + pressure, 10, 20);

      p.stroke(200, 50);
      p.line(p.mouseX, 0, p.mouseX, p.height);
      p.line(0, p.mouseY, p.width, p.mouseY);

      p.noStroke();
      p.fill(100);
      var w = p.width * pressure;
      p.rect(0, 0, w, 4);

      p.push();
      if (isTwoFingerTap) {
        p.fill(255, 0, 0);
      } else {
        p.fill(50);
      }
      p.text("two finger tap", 10, 40);
      p.pop();

      p.push();
      if (isThreeFingerTap) {
        p.fill(0, 255, 0);
      } else {
        p.fill(50);
      }
      p.text("three finger tap", 10, 60);
      p.pop();
    }
  };

  p.keyPressed = function() {
    // COMMAND + z -> undo
    if (p.keyIsDown(91) || (p.keyIsDown(93) && key == "z")) {
      undo();
    }
  };
}, "p5_instance_02");

/***********************
 *        INPUT        *
 ***********************/

// DEBUG: options don't seem to have an effect
// set options to prevent default behaviors for swipe, pinch, etc

var options = {
  preventDefault: true,
  transform: false,
  taps: 1
};

// document.body registers gestures anywhere on the page
var mc = new Hammer.Manager(document.body);

// Tap recognizer with one finger
mc.add(
  new Hammer.Tap({
    event: "onefingertap",
    pointers: 1,
    options
  })
);

// Tap recognizer with two fingers
mc.add(
  new Hammer.Tap({
    event: "twofingerstap",
    pointers: 2,
    options
  })
);

// Tap recognizer with three fingers
mc.add(
  new Hammer.Tap({
    event: "threefingerstap",
    pointers: 3,
    options
  })
);

mc.get("twofingerstap").recognizeWith("onefingertap");
mc.get("threefingerstap").recognizeWith("twofingerstap");

// we only want to trigger a specific tap when
// we have NOT detected a tap with a larger number of fingers
//mc.get("onefingertap").requireFailure("twofingerstap");
//mc.get("twofingerstap").requireFailure("threefingerstap");

mc.on("twofingerstap", undo);

mc.on("threefingerstap", redo);

var timer;

mc.on("threefingerstap", () => {
  mc.get("twofingerstap").set({ enable: false });
  // start a countdown, when the countdown ends, re-enable two finger tap
  timer = setTimeout(mc.get("twofingerstap").set({ enable: true }), 1000); // not working
});

function undo(event) {
  console.log(event);
  isTwoFingerTap = !isTwoFingerTap;
  console.log("undo");
}

function redo(event) {
  console.log(event);
  isThreeFingerTap = !isThreeFingerTap;
}

// Initializing Pressure.js
// https://pressurejs.com/documentation.html
function initPressure() {
  //console.log("Attempting to initialize Pressure.js ");

  Pressure.set(document.body, {
    start: function(event) {
      // this is called on force start
      isDrawing = true;
      isDrawingJustStarted = true;
    },
    end: function() {
      // this is called on force end
      isDrawing = false;
      pressure = 0;
    },
    change: function(force, event) {
      if (isPressureInit == false) {
        console.log("Pressure.js initialized successfully");
        isPressureInit = true;
      }
      //console.log(force);
      pressure = force;
    }
  });

  Pressure.config({
    polyfill: true, // use time-based fallback ?
    polyfillSpeedUp: 1000, // how long does the fallback take to reach full pressure
    polyfillSpeedDown: 300,
    preventSelect: true,
    only: null
  });
}

/***********************
 *      UTILITIES      *
 ***********************/

// Disabling scrolling and bouncing on iOS Safari
// https://stackoverflow.com/questions/7768269/ipad-safari-disable-scrolling-and-bounce-effect

function preventDefault(e) {
  e.preventDefault();
}

function disableScroll() {
  document.body.addEventListener("touchmove", preventDefault, {
    passive: false
  });
}
/*
function enableScroll(){
    document.body.removeEventListener('touchmove', preventDefault, { passive: false });
}*/
