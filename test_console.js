const request = require('request');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const csv = require('csv');
const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-node');
const http = require('http');
const fs = require('fs');
const cheerio = require('cheerio');
const liveServer = require("live-server");


async function loadModel(file) {
  try {
    path="file://"+file+"/model.json"
    const model = await tf.loadLayersModel(path) ;

    return model ;

  } catch (error) {
    console.error(`Error loading model: ${error}`);
  }
};



String.prototype.replaceAll = function (target, payload) {
  let regex = new RegExp(target, 'g')
  return this.valueOf().replace(regex, payload)
};


function scaleData(x) {
  var xMean = x.reduce((a, b) => a + b) / x.length;
  var xStd = Math.sqrt(
    x
      .map((i) => (i - xMean) ** 2)
      .reduce((a, b) => a + b) / x.length
  );
  var xScaled = x.map((i) => (i - xMean) / xStd);
  return xScaled;
}




function returnArrayFromPointsInSet(points){
  let [x,y] = points.split(",").map(x => parseInt(x)) ;
  return [x,y]
}


function flatten_1(arr) {
  let flatArr = [] ;
  for (let element of arr) {
      if (Array.isArray(element)) {
          flatArr = flatArr.concat(flatten_1(element));
      } else {
          flatArr.push(element);
      }
  }
  return flatArr;
}



function returnCurrentSetOfPingPong(tranche_dict) {

  let tranche=[parseInt(tranche_dict["Sets"][0]),returnArrayFromPointsInSet(tranche_dict["1Set"]),returnArrayFromPointsInSet(tranche_dict["2Set"]),returnArrayFromPointsInSet(tranche_dict["3Set"]),returnArrayFromPointsInSet(tranche_dict["4Set"]),returnArrayFromPointsInSet(tranche_dict["5Set"]),returnArrayFromPointsInSet(tranche_dict["6Set"]),returnArrayFromPointsInSet(tranche_dict["7Set"])];

  tranche=flatten_1(tranche)

  return [tranche[0]-1].concat(scaleData(tranche.slice(1)));

};



function cleanScrapeData(data) {
  const temp = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i] !== "" && data[i].indexOf("№") === -1 && data[i].indexOf("+") === -1) {
      temp.push(data[i]);
    }
  }
  return temp;
};


function scoreFormatCorrection(score) {
  let totalLengthScore = 0;
  for (let i = 1; i < score.length; i++) {
    if (!isNaN(score[score.length - i])) {
      totalLengthScore += 1;
    };
  };


  let newScore = ["0,0"];
  const middle = Math.floor(totalLengthScore / 2);

  if (totalLengthScore / 2 >= 2) {
    newScore = score.slice(0, -totalLengthScore)
                .concat(score.slice(-totalLengthScore + 1, -middle))
                .concat(score[score.length - totalLengthScore])
                .concat(score.slice(-middle + 1))
                .concat(score[score.length - middle]);
  };

  return newScore;
}


function parseMatchData(matchData) {
  const matches = [];
  for (const data of matchData) {
    const matchInfo = data;
    if (matchInfo.length > 5) {
      const match = {};
      match["Sets"] = matchInfo[0];
      match["Match"] = matchInfo.length > 3 ? matchInfo[1] + " vs " + matchInfo[2] : "0";

      let totalLengthScore = 0;
      for (let i = 1; i < matchInfo.length; i++) {
        if (!isNaN(matchInfo[matchInfo.length - i])) {
          totalLengthScore += 1;
        };
      };

      let j = isNaN(matchInfo[3]) ? 0 : 1;

      match["1Set"] = totalLengthScore / 2 >= 2 ? matchInfo[4 - j] + "," + matchInfo[4 + totalLengthScore / 2 - j] : "0,0";
      match["2Set"] = totalLengthScore / 2 >= 3 ? matchInfo[5 - j] + "," + matchInfo[5 + totalLengthScore / 2 - j] : "0,0";
      match["3Set"] = totalLengthScore / 2 >= 4 ? matchInfo[6 - j] + "," + matchInfo[6 + totalLengthScore / 2 - j] : "0,0";
      match["4Set"] = totalLengthScore / 2 >= 5 ? matchInfo[7 - j] + "," + matchInfo[7 + totalLengthScore / 2 - j] : "0,0";
      match["5Set"] = totalLengthScore / 2 >= 6 ? matchInfo[8 - j] + "," + matchInfo[8 + totalLengthScore / 2 - j] : "0,0";
      match["6Set"] = totalLengthScore / 2 >= 7 ? matchInfo[9 - j] + "," + matchInfo[9 + totalLengthScore / 2 - j] : "0,0";
      match["7Set"] = totalLengthScore / 2 >= 8 ? matchInfo[10 - j] + "," + matchInfo[10 + totalLengthScore / 2 - j] : "0,0";
      match["Total points"] = matchInfo[matchInfo.length - totalLengthScore / 2 - 1] + "," + matchInfo[matchInfo.length - 1];
      
      matches.push(match);
    }
  }
  return matches;
}




function mergeScoreAndTime(data) {
  const temp = [];
  for (let i = 0; i < data.length - 1; i += 2) {
    if (data.length > 1 && data[i + 1].length > 0 && data[i + 1][0].includes("Set")) {
      temp.push(data[i + 1].concat(scoreFormatCorrection(data[i])));
    }
  }
  return temp;
}








function ScaleSetOfPingPongForModels(matchs) {
  let currentSet =[] ;
  for (let i = 0; i < matchs.length ; i++) {

    if( typeof matchs[i] === "object" )  
    { currentSet.push(returnCurrentSetOfPingPong(matchs[i])); }
    else {i+=1}
  };
  return currentSet;
};

let urls= ["https://1xbet.com/fr/live/table-tennis/2064427-masters"]



// let urls_dict = {
//   "Masters": "https://1xbet.com/fr/live/table-tennis/2064427-masters",
//   "MasterWomen": "https://1xbet.com/fr/live/table-tennis/2071520-masters-women",
//   "ArtCup": "https://1xbet.com/live/table-tennis/2031986-art-cup",
//   "ProSpinSeries": "https://1xbet.com/live/table-tennis/2075339-pro-spin-series",
//   "ProSpinSeriesWomen": "https://1xbet.com/live/table-tennis/2081296-pro-spin-series-women",
//   "ProLeagueTcheque": "https://1xbet.com/fr/live/table-tennis/2095165-pro-league-czech-republic",
//   "ProLeague": "https://1xbet.com/live/table-tennis/1691055-pro-league",
//   "TchequeTTStarSeries": "https://1xbet.com/live/table-tennis/2077789-czech-republic-tt-star-series",
//   "ChampionatArmenieITTCupGroupeA": "https://1xbet.com/live/table-tennis/1491743-armenia-itt-cup-group-a",
//   "TournoiInternationalDohaFemme": "https://1xbet.com/live/table-tennis/2192159-international-tournament-doha-women",
//   "AtrCup": "https://1xbet.com/live/table-tennis/2031986-art-cup",
//   "WinCup": "https://1xbet.com/live/table-tennis/1792858-win-cup",
//   "SkeptaCup": "https://1xbet.com/live/table-tennis/1733171-setka-cup",
// }


let urls_dict = {
  "Masters": "https://1xbet.com/fr/live/table-tennis/2064427-masters",
}



async function scrapeElements(urls_dict) {
  let allData_Non_Scaled = [];
  var allData_Scaled = [];
  
  for ( const url of Object.values(urls_dict) ) {
      try {
          let key;
          const result = await new Promise((resolve, reject) => {
              request.get({ url , headers: { "Accept-Language": "fr-FR,en;q=0.5" } }, (error, response, html) => {
                  if (error) {
                      reject(error);
                      return;
                  }

                  key = Object.keys(urls_dict).filter(key => urls_dict[key] === url)[0] ;
                  const dom = new JSDOM(html);
                  const document = dom.window.document
  
                  const elements = document.querySelectorAll('.c-events-scoreboard__item');
  
                  const elementsArray = Array.from(elements);
                  let data = elementsArray.map(element => element.textContent.replaceAll(" ","").split("\n") );
              
  
                  data = data.map(cleanScrapeData);
  
                  data = mergeScoreAndTime(data);
  
                  const newData = parseMatchData(data);
  
                  for (let j=0; j<newData.length; j++) {
                    newData[j]["Tournament"] = key;
                  };
                  
                  resolve(newData);
              });
          });

          // console.log(key);
          // console.log(result);
          // allData_Non_Scaled.push(key);
          allData_Non_Scaled = [...allData_Non_Scaled , ...result];
      } catch (error) {
          console.log(`Error occurred while scraping ${url}: ${error}`);
      }

  }
  // console.log(allData_Non_Scaled);
  allData_Scaled= ScaleSetOfPingPongForModels(allData_Non_Scaled);
  return [allData_Non_Scaled, allData_Scaled] ;
}



// const file="js_model_1000_000_StopEpoch"
// const file="js_model_1000_000"
const file="pp_1_000_000_2.938"
const model = loadModel(file);


async function evaluateModel(model, datas) {
  try {
      let predictions ;
      const scaledData = tf.tensor(datas[1]) ;

      model= await model ;
      predictions = await model.predict( scaledData ) ;

      tf.dispose(scaledData)

      const plus= 1.5
      const minus= -1.5-0.334
      retour_min = await predictions.add( minus ).round().array() ;
      retour_max = await predictions.add( plus ).round().array() ;


      let sets_Min_Max = [];
      for (let i = 0; i < retour_min.length; i++) {
        sets_Min_Max.push([ datas[0][i] , retour_min[i] , retour_max[i]]);
      };

      return sets_Min_Max ;

  } 
  catch (error) {
      console.log(`Error elavluating the model: ${error}`);
  };
};



async function getPromiseAndPredictions(model, urls) {
  // console.time('Execution time');
  const data = await scrapeElements(urls);
  const predictions = await evaluateModel(model, data);
  // console.timeEnd('Execution time');
  return predictions ;
}


// setInterval( async () => {


//     console.time('Execution time');
//     const predictions = await getPromiseAndPredictions(model, urls_dict); 
//     // console.clear();
//     // process.stdout.write('\033c');

    
//     console.log(Array.from(predictions)) ;
//     console.timeEnd('Execution time') ;

// }, 5000);



async function runPredictions() {
  const predictions = await getPromiseAndPredictions(model, urls_dict); 
  console.clear();
  console.log(Math.random());
  // console.log(Array.from(predictions));
  // Additional code to run after predictions are completed
}


setInterval(runPredictions, 100);



// const predictions = getPromiseAndPredictions(model,urls_dict).then( test => { console.log(test) ; } ) ;


