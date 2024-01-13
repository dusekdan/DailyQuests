(function(global) {
var Utils = {};

/**
 * Converts date object into number of seconds since the beginning 
 * of the epoch.
 * 
 * @param {Date} date 
 * @returns {Int} Number of seconds since the start of 
 *  the epoch.
 */
const getSecondsSinceEpoch = date => {
    let milliseconds = date.getTime();

    return Math.floor(milliseconds/1000);
}

/**
 * Gets day start and end in seconds since epoch
 * for date provided.
 */
const getDayStartEnd = dayDate => {
    let tuple = [];
    
    dayDate.setHours(0,0,0);
    tuple.push(
        Utils.getSecondsSinceEpoch(new Date(dayDate))
    );

    dayDate.setHours(23,59,59);
    tuple.push(
        Utils.getSecondsSinceEpoch(new Date(dayDate))
    );

    return tuple;
}

/**
 * Performs a reset for all inputs belonging to a specific
 * form, identified by the form's id.
 */
const resetForm = formId => {
    document.getElementById(formId).reset();
}


/**
 * Receives an array, retuns a random element from the array.
 */
const randomChoice = choices => {
    let length = choices.length;
    let randomlyChosenIndex = Math.floor(Math.random() * (0 - length) + length);
    return choices[randomlyChosenIndex];
}


/**
 * Remove duplicates from array.
 * 
 * Source: https://stackoverflow.com/a/1584377 
 */
const arrayUnique = array => {
    let a = array.concat();
    for(let i=0; i<a.length; ++i) {
        for(let j=i+1; j<a.length; ++j) {
            if(a[i] === a[j])
                a.splice(j--, 1);
        }
    }

    return a;
}


/**
 * Randomize array element order in-place.
 * Using Durstenfeld shuffle algorithm.
 * 
 * Source: https://stackoverflow.com/a/12646864
 */
const shuffleArray = array => {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }

    return array;
}


/**
 * Returns array of id:value pairs for given form, as identified by id. 
 */
const collectFormInputtedValues = formId => {
    let allInputsSelector = "#" + formId +">input,#" + formId+">select,#" + formId+">textarea"
    let inputElements = document.querySelectorAll(allInputsSelector);
    
    let values = {}
    for (let i = 0; i < inputElements.length; i++) {

        if (inputElements[i].tagName.toLowerCase() == "input" ||
            inputElements[i].tagName.toLowerCase() == "textarea") {
                
                if (inputElements[i].getAttribute("type")?.toLocaleLowerCase() == "submit") {
                    console.log("Skipping input type=submit")
                    continue;
                }

            values[inputElements[i].id] = inputElements[i].value;
        }
        else if (inputElements[i].tagName.toLowerCase() == "select") {
            let selectedValue = "";
            for (let c = 0; c < inputElements[i].children.length; c++) {
                if (inputElements[i].children[c].selected) {
                    selectedValue = inputElements[i].children[c].value;
                }
            }

            if (selectedValue != "") {
                values[inputElements[i].id] = selectedValue;
            }
        } 
    }

    return values
}


/**
 * Returns JSON of whatever was encoded via JSON.stringify
 * into localStorage, under key `GameState`.
 */
const getUserPrefs = () => {
    return JSON.parse(localStorage.getItem("GameState")) 
}


/**
 * Receives JSON value of whatever it is that describes a 
 * "GameState" and encodes it via JSON.stringify into localStorage
 * under key `GameState`.
 */
const saveUserPrefs = userPrefs => {
    localStorage.setItem("GameState", JSON.stringify(userPrefs));
}


/**
 * Gets key by value
 * source: https://stackoverflow.com/a/36705765
 */
const getKeyByValue = (obj, value) => {
    return Object.keys(obj)[Object.values(obj).indexOf(value)];
}


/**
 * To generated GUID with `crypto.randomUUID()`, it has to be called in a 
 * secure context. This function generates somewhat random GUID without the
 * need to be on secure context.
 * 
 * Obviously, there are security reasons for this, but you can use this no
 * problem if the GUID you are looking for doesn't have to cryptographically
 * guaranteed to be unique or unpredictable. 
 * 
 * Source: https://stackoverflow.com/a/2117523
 */
function createGuid_insecureContext() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}


const randomNumberFromRange = (start, end) =>  {
    const range = end - start;
    return start + Math.random() * range;
}


const randomIntNumberFromRange = (start, end) => {
    let min = Math.ceil(start);
    let max = Math.floor(end);
    return Math.floor(Math.random() * (max-min+1)) + min;
}


/**
 * Provided seconds until time in future, returns string saying how many 
 * days, hours, minutes and seconds are remaining.
 * 
 * Source: https://stackoverflow.com/a/36099084
 */
function secondsToHumanReadableTimeRemaining(scnd) {
    var seconds = parseInt(scnd, 10);
    var days = Math.floor(seconds / (3600*24));
    seconds  -= days*3600*24;
    var hrs   = Math.floor(seconds / 3600);
    seconds  -= hrs*3600;
    var mnts = Math.floor(seconds / 60);
    seconds  -= mnts*60;

    return days + "d " + hrs + "h " + mnts + "m " + seconds + "s";
}


// Time related
Utils.getSecondsSinceEpoch = getSecondsSinceEpoch;
Utils.secondsToHumanReadableTimeRemaining = secondsToHumanReadableTimeRemaining;
Utils.getDayStartEnd = getDayStartEnd;

// Form processing related
Utils.resetForm = resetForm;
Utils.randomChoice = randomChoice;
Utils.collectFormInputtedValues = collectFormInputtedValues;

// Collections
Utils.getKeyByValue = getKeyByValue;
Utils.arrayUnique = arrayUnique;
Utils.shuffleArray = shuffleArray;

// Local stores
Utils.getUserPrefs = getUserPrefs;
Utils.saveUserPrefs = saveUserPrefs;

// Miscelanous
Utils.createGuid_insecureContext = createGuid_insecureContext;
Utils.randomNumberFromRange = randomNumberFromRange;
Utils.randomIntNumberFromRange = randomIntNumberFromRange;
Utils.log = console.log;


// If you are not content with having the `Util` as a namespace, update the 
// `global.Util` to `global.WhateverNameYouWant`.
global.Util = Utils;
})(window);