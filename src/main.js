const util = require('util');
const fs = require('fs');
const axios = require('axios');
const NodeWebcam = require('node-webcam');
const TrainingApi = require("@azure/cognitiveservices-customvision-training");
const PredictionApi = require("@azure/cognitiveservices-customvision-prediction");
const msRest = require("@azure/ms-rest-js");

require("dotenv").config();

var opts = {
    width: 1440,
    height: 960,
    quality: 1000,
    frames: 10,
    delay: 0,
    saveShots: true,
    output: "jpeg",
    device: false,
    //callbackReturn: "location",
    callbackReturn: "buffer",
    verbose: false
};

var Webcam = NodeWebcam.create(opts);
var tram_now = tram_before = false;

function main () {
  Webcam.capture( "test_picture", function( err, data ) { checktram(data); } );
  setTimeout(() => main(), 3000);
}

async function checktram(testFile) {

  //const testFile = fs.readFileSync(`./test_picture.jpg`);

  const predictionKey = process.env["predictionKey"];
  const predictionResourceId = process.env["predictionResourceId"];
  const predictionEndpoint = process.env["predictionEndpoint"];
  const hueendpoint = process.env["hueendpoint"];
  const predictionModelID = process.env["predictionModelID"];
  const predictionModelTrain = process.env["predictionModelTrain"];

  const predictor_credentials = new msRest.ApiKeyCredentials({ inHeader: { "Prediction-key": predictionKey } });
  const predictor = new PredictionApi.PredictionAPIClient(predictor_credentials, predictionEndpoint);
  const results = await predictor.detectImage(predictionModelID, predictionModelTrain, testFile);

  tram_now = false;
  results.predictions.forEach(predictedResult => {
      if (predictedResult.tagName == "tram" && predictedResult.probability > 0.9) {
        console.log("\nDetected: " + predictedResult.tagName + "("+predictedResult.probability * 100+")")
        tram_now = true;
      }
  });

  if (tram_now != tram_before) {
    if (tram_now) {
      axios.get("https://huecontrol.azurewebsites.net/api/HttpTrigger1?code="+hueendpoint+"&action=on");
      console.log("Tram ! ... switch light on\n");
    }
    else {
      axios.get("https://huecontrol.azurewebsites.net/api/HttpTrigger1?code="+hueendpoint+"&action=off");
      console.log("No more tram ... switch light off\n");
    }
    tram_before = tram_now;
  }
  else {
    console.log("Still no tram ... no change of light");
  }
};

main();
