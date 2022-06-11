const util = require('util');
const fs = require('fs');
const axios = require('axios');

require("dotenv").config();

var NodeWebcam = require('node-webcam');

var opts = {
    width: 1440,
    height: 960,
    quality: 1000,
    frames: 10,
    delay: 0,
    saveShots: true,
    output: "jpeg",
    device: false,
    callbackReturn: "location",
    verbose: false
};

const TrainingApi = require("@azure/cognitiveservices-customvision-training");
const PredictionApi = require("@azure/cognitiveservices-customvision-prediction");
const msRest = require("@azure/ms-rest-js");

var isthereatram = false;
var therewasatram = false;

var Webcam = NodeWebcam.create(opts);

function main () {
  Webcam.capture( "test_picture", function( err, data ) { checktram(); } );
  setTimeout(() => main(), 3000);
}

async function checktram() {

  const testFile = fs.readFileSync(`./test_picture.jpg`);

  const predictionKey = process.env["predictionKey"];
  const predictionResourceId = process.env["predictionResourceId"];
  const predictionEndpoint = process.env["predictionEndpoint"];
  const hueendpoint = process.env["hueendpoint"];


  const predictor_credentials = new msRest.ApiKeyCredentials({ inHeader: { "Prediction-key": predictionKey } });
  const predictor = new PredictionApi.PredictionAPIClient(predictor_credentials, predictionEndpoint);

  const results = await predictor.detectImage("4e46d5ae-3b35-4df0-997e-6feecdeb760e", "Iteration2", testFile);

  // Show results

  var isthereatram = false;
  results.predictions.forEach(predictedResult => {
      if (predictedResult.tagName == "tram" && predictedResult.probability > 0.7) {
        console.log("Detected: " + predictedResult.tagName + "("+predictedResult.probability * 100+")")
        isthereatram = true;
      }
  });
  if (isthereatram) {
    axios.get("https://huecontrol.azurewebsites.net/api/HttpTrigger1?code="+hueendpoint+"&action=on");
    therewasatram = true;
    console.log("Tram ! ... switch light on");
  }
  else if (therewasatram) {
    therewasatram = false;
    axios.get("https://huecontrol.azurewebsites.net/api/HttpTrigger1?code="+hueendpoint+"&action=off");
    console.log("No more tram ... switch light off");
  }
  else {
    console.log("Still no tram ... no change of light");
  }
};

main();
