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




function returnArrayFromPointsMatchs(points){
  let [x,y] = points.split(",").map( x => parseInt(x) ) ;
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



function returnCurrentMatchOfBasketball(tranche_dict) {

  let tranche=[ parseInt( tranche_dict["Duration"].split(":")[0])*60 + parseInt( tranche_dict["Duration"].split(":")[1] ) , returnArrayFromPointsMatchs(tranche_dict["1Quart-temps"]),returnArrayFromPointsMatchs(tranche_dict["2Quart-temps"]),returnArrayFromPointsMatchs(tranche_dict["3Quart-temps"]),returnArrayFromPointsMatchs(tranche_dict["4Quart-temps"]) ] ;

  tranche=flatten_1(tranche)

  return [].concat(scaleData(tranche) );

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
      match["Duration"] = matchInfo[0];
      match["Match"] = matchInfo.length > 3 ? matchInfo[2] + " vs " + matchInfo[3] : "0";

      let totalLengthScore = 0;
      for (let i = 1; i < matchInfo.length; i++) {
        if (!isNaN(matchInfo[matchInfo.length - i])) {
          totalLengthScore += 1;
        };
      };

      let j = isNaN(matchInfo[3]) ? 0 : 1;

      match["1Quart-temps"] = totalLengthScore / 2 >= 2 ? matchInfo[4 - j] + "," + matchInfo[4 + totalLengthScore / 2 - j] : "0,0";
      match["2Quart-temps"] = totalLengthScore / 2 >= 3 ? matchInfo[5 - j] + "," + matchInfo[5 + totalLengthScore / 2 - j] : "0,0";
      match["3Quart-temps"] = totalLengthScore / 2 >= 4 ? matchInfo[6 - j] + "," + matchInfo[6 + totalLengthScore / 2 - j] : "0,0";
      match["4Quart-temps"] = totalLengthScore / 2 >= 5 ? matchInfo[7 - j] + "," + matchInfo[7 + totalLengthScore / 2 - j] : "0,0";
      match["Total points"] = matchInfo[matchInfo.length - totalLengthScore / 2 - 1] + "," + matchInfo[matchInfo.length - 1];

      matches.push(match);
    }
  }
  return matches;
}

function mergeScoreAndTime(data) {
  let temp = [];
  for (let i = 0; i < data.length - 1; i += 2) {
    if (data.length > 1 && data[i + 1].length > 1 && (data[i + 1][1].includes("temps") || data[i + 1][1].includes("Quarter") || data[i + 1][1].includes("Set"))) {
      temp.push(data[i + 1].concat(scoreFormatCorrection(data[i])));
    }
  }

  return temp;
}






function ScaleMatchsOfBasketballForModels(matchs) {
  let currentSet =[] ;
  for (let i = 0; i < matchs.length ; i++) {

    if( typeof matchs[i] === "object" )  
    { currentSet.push(returnCurrentMatchOfBasketball(matchs[i])); }
    else {i+=1}
  };
  return currentSet;
};



let urls_dict_ = {

  "2k23-cyber-league":"https://1xbet.com/live/basketball/2468168-nba-2k23-cyber-league",
  "2k22-cyber-league":"https://1xbet.com/live/basketball/2301250-nba-2k22-cyber-league",
  "cyber-nba-2k22":"https://1xbet.com/live/basketball/2401555-cyber-nba-2k22",

}


let urls_dict = {

  "2k23-cyber-league":"https://1xbet.com/live/basketball/2468168-nba-2k23-cyber-league",

}


// let list_championships = Object.keys(urls_dict_total);


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
  allData_Scaled= ScaleMatchsOfBasketballForModels(allData_Non_Scaled);

  retour= [allData_Non_Scaled, allData_Scaled] ;


  return retour ;
}


scrapeElements(urls_dict).then((data) => { console.log(data) });


// const file="model_1_000_000_2.736"
// const file= "model_1_000_000_Binary_17"
// const model = loadModel(file);


function binaryToNumber(number){
  if (number >=0.8 ){
    return 18 ;
  }
  else{
    return number ;
  }
}




async function evaluateModel(model, datas) {
  try {
      let predictions ;
      const scaledData = tf.tensor(datas[1]) ;

      model= await model ;
      predictions = await model.predict( scaledData ) ;

      tf.dispose(scaledData)

      const plus= 0 ;
      const minus= 0 ;
      retour_min = await predictions.add( minus ).array() ;
      retour_max = await predictions.add( plus ).array() ;


      let sets_Min_Max = [];
      for (let i = 0; i < retour_min.length; i++) {
        sets_Min_Max.push([ datas[0][i] , binaryToNumber(retour_min[i]) , binaryToNumber(retour_max[i]) ]);
      };

      return sets_Min_Max ;

  }
  catch (error) {
      console.log(`Error elavluating the model: ${error}`) ;
  };
};



async function getPromiseAndPredictions(model=model, urls=urls_dict) {
  // console.time('Execution time');
  const data = await scrapeElements(urls);
  const predictions = await evaluateModel(model, data);
  // console.timeEnd('Execution time');
  return predictions ;
}




// // create an HTTP server
// const server = http.createServer( (req, res) => {
//   fs.readFile('./homepage.html', (err, data) => {
//     const predictions = 9 ;
//     if (err) {
//       res.writeHead(404);
//       res.end(JSON.stringify(err));
//       return;
//     }
//     res.writeHead(200, {'Content-Type': 'text/html'});
//     res.write(data);
//     // res.write(JSON.stringify(predictions));
//     res.end();
//   });
// });





// // start the server
// const port = 3000;
// server.listen(port, () => {
//   console.log(`Server running at http://127.0.0.1:${port}/`);
// });






const params = {
    port: 3000, // Set the server port
    host: "0.0.0.0", // Set the address to bind to
    root: ".", // Set root directory that's being served
    open: false, // When false, it won't automatically open the browser
    ignore: 'scss,my/templates', // comma-separated string for paths to ignore
    file: "homepage.html", // When set, serve this file (server root relative) for every 404 (useful for single-page applications)
    wait: 1000, // Waits for all changes, before reloading. Defaults to 0 sec.
    mount: [['/components', './node_modules']], // Mount a directory to a route.
    logLevel: 2, // 0 = errors only, 1 = some, 2 = lots
    middleware: [function(req, res, next) { next(); }] // Takes an array of Connect-compatible middleware that are injected into the server middleware stack
};


// liveServer.start(params);




async function runPredictions() {
  console.time('Execution time');
  const predictions = await getPromiseAndPredictions(model, urls_dict);

  const html = fs.readFileSync('./homepage_b.html', 'utf8') ;

  const $ = cheerio.load(html) ;
  const predictionsString = JSON.stringify(predictions) ;

  $('#refreshed_div').html( `var predictions = ${predictionsString} ; ` ) ;
  $('#list_championships').html( `var list_championships = ${JSON.stringify(list_championships)} ; ` ) ;
  const newHtml = $.html();
  fs.writeFileSync('./homepage_b.html', newHtml) ;

  console.timeEnd('Execution time');

}


async function runPredictionsWithInterval() {
  while (true) {
    await runPredictions();
    await new Promise(resolve => setTimeout(resolve, 1_0));
  }
}




// runPredictionsWithInterval();

// console.log(list_championships)


// const predictions = getPromiseAndPredictions(model,urls_dict).then( test => { console.log(test) ; } ) ;


