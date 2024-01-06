/**
 * Whatever is not needed to be included in the main file that contians a logic for the POC
 * goes into this file.
 * 
 * It's just to make the code a bit easier to navigate during POC phase in order not to have
 * it messed up with too many of the functions that are not functional/needed, but might be
 * useful for "refresher" on some of the libs work, or when I need to debug something quick.
 */
const _debug_createQuest = () => {

    // select one quest def from blueprints
    let questBPs = alasql("SELECT * FROM " + QuestsBPTableName);
    if (questBPs.length <= 0) {
        console.log("Can't create quest, because there is no quest blueprint available in the table.");
        return;
    }

    let todayDate = new Date();
    todayDate.setHours(0,0,0);
    let todayStart = Util.getSecondsSinceEpoch(new Date(todayDate));
    todayDate.setHours(23, 59, 59);
    let todayEnd = Util.getSecondsSinceEpoch(new Date(todayDate));

    // insert it into quests table as assigned with validity between today start and today end
    let questId = crypto.randomUUID();
    let questBlueprintId = Util.randomChoice(questBPs).questId;
    let questActiveStart = todayStart;
    let questActiveEnd = todayEnd;
    let questStatus = "ASSIGNED"; // ASSIGNED | STARTED | COMPLETED | FAILED | EXPIRED | ABANDONED

    let insertedRows = alasql("INSERT INTO " + QuestsTableName + "(questId, questBlueprintId, activeStart, activeEnd, questStatus) VALUES (?, ?, ?, ?, ?)", [questId, questBlueprintId, questActiveStart, questActiveEnd, questStatus])

    console.log("Inserted rows=" + insertedRows)
    
    dailyQuestsLoad();
}

const _unreachable_seedQuestDefinitions = () => {
    let questId = crypto.randomUUID();
    let questName = "10 Push ups top up"
    let questDescription = "Perform 10 push ups"
    let questReward = 10;
    let questCategory = "Fitness"

    let rowsInserted = alasql("INSERT INTO " + QuestsBPTableName + " (questId, questName, questDescription, questRewardAmount, questCategory) VALUES (?,?,?,?,?)", [questId, questName, questDescription, questReward, questCategory])

    console.log("Inserted " + rowsInserted + " (" + questName + " quest)");
}