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

Utils.getSecondsSinceEpoch = getSecondsSinceEpoch;
Utils.resetForm = resetForm;
Utils.randomChoice = randomChoice;
Utils.collectFormInputtedValues = collectFormInputtedValues;
Utils.getKeyByValue = getKeyByValue;

Utils.getUserPrefs = getUserPrefs;
Utils.saveUserPrefs = saveUserPrefs;

Utils.log = console.log;

global.Util = Utils;
})(window);