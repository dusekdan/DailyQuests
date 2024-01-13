// Service worker setup is required for the app to be considered installable
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
    .then(registration => {
        console.log("Service Worker registered with scope:", registration.scope);
    })
    .catch(error => {
        console.error("Service Worker registration failed with: " , error);
    });
}

// According to documentation "fetch" event must be implemented for the app to become installable
window.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

print = console.log; // TODO: Just get rid of this overload when you no longer mistake console.log for print


/**
 * Set up local storage database
 */
const DatabaseName = "DailyQuests"
const QuestsBPTableName = DatabaseName + ".QuestBlueprints"
const CategoryTableName = DatabaseName + ".Categories"
const QuestsTableName = DatabaseName + ".Quests"
const RewardBPTableName = DatabaseName + ".RewardBlueprints"
const ensureDatabaseAvailable = () => {

    const QuestBlueprintDDL = "CREATE TABLE IF NOT EXISTS " + QuestsBPTableName + " (questId string, questName string, questDescription string, questRewardAmount number, questCategory string)";
    const CategoryDDL = "CREATE TABLE IF NOT EXISTS " + CategoryTableName + " (categoryId string, categoryName string)";
    const QuestsTableDDL = "CREATE TABLE IF NOT EXISTS " + QuestsTableName + " (questId string, questBlueprintId string, activeStart datetime, activeEnd datetime, questStatus string, completedAt datetime, failedAt datetime)";
    const RewardBlueprintsDDL = "CREATE TABLE IF NOT EXISTS " + RewardBPTableName + " (rewardId string, rewardName string, rewardDescription string, rewardCost number)";

    
    alasql("CREATE localStorage DATABASE IF NOT EXISTS DailyQuests");
    alasql("ATTACH localStorage DATABASE DailyQuests AS DailyQuests");

    alasql(QuestBlueprintDDL);
    alasql(CategoryDDL);
    alasql(QuestsTableDDL);
    alasql(RewardBlueprintsDDL);

    // Seeding
    if (alasql("select * from " + CategoryTableName) == 0) {
        console.log("No categories were found. Seeding categories...")
        alasql("INSERT INTO " + CategoryTableName + " VALUES (?,?)", [crypto.randomUUID(), "Default"])
    }

    console.log("ensureDatabaseAvailable() finished")
}

const ensureLocalStateStore = () => {

    if (localStorage.getItem("GameState") == null) {
        let gameStateStruct = { rewardStore: {rewards: [], purchase: []}, userData: { name: "IllegalPrime", currency: 200, dailyQuestsLimit: 25, dailyQuestsCategoryLimits: [{categoryId: undefined, limit: 10}]}, uiData: {lastOpenedPage: "Daily Quests"} }

        localStorage.setItem("GameState", JSON.stringify(gameStateStruct));
    }

    let gameState = JSON.parse(localStorage.getItem("GameState"))
    // TODO: Implement validation and seeding logic

    console.log("Loaded game state for username=" + gameState.userData.name);

    return gameState;
}


/*
 * Application logic actually
 */
const main = () => {
    attachFormSubmitListeners();
    attachUIElementListeners();
    ensureDatabaseAvailable();

    let userPrefs = ensureLocalStateStore();

    let pageOnStartup = userPrefs.uiData.lastOpenedPage;
    displayPage(pageOnStartup);

    reloadUserPrefsDisplayElements();

    rewardStoreLoad();
    
    questManagerLoadList();
    rewardManagerLoadList();
    dailyQuestsLoad();

    // Countdown init for daily quests page
    updateDailyQuestsTimeRemaining();
    setInterval(updateDailyQuestsTimeRemaining, 1000);
}

const displayPage = page => {
    console.log("displayPage page="+page)
    
    let allPages = ["Daily Quests", "Reward Store", "Manager"]
    let pageIds = {"home-page": "Daily Quests", "reward-store": "Reward Store", "quest-manager": "Manager"}

    for (let i = 0; i < allPages.length; i++) {
        print(i)
        if (allPages[i] == page) {
            document.getElementById(
                Util.getKeyByValue(pageIds, page)
            ).classList.remove("page-hidden");
            
            console.log("remove page-hidden class for " + page);
        }

        if (allPages[i] != page) {
            document.getElementById(
                Util.getKeyByValue(pageIds, allPages[i])
            ).classList.add("page-hidden");
            console.log("add page-hidden to " + page);
        }
    }

    // set last opened page
    let userPrefs = Util.getUserPrefs();
    userPrefs.uiData.lastOpenedPage = page;
    Util.saveUserPrefs(userPrefs);
}

// ? TODO Post-MVP: When quest definition is deleted, remove any active quests related to that record.
// ? TODO Post-MVP: A progress bar under reward that allows seeing how much currency needs to be earned
// ? TODO Post-MVP: Reward types & history - create "one time reward", e.g. for purchasing a desired item
// ? TODO Post-Full-Release-Feature: Pomodoro with quest-like/currency earning options (who knows maybe even integration with spotify)
// ? TODO Post-Full-Release-Feature: Streaks and spells type of app (inspired by excel sheet)

// ? TODO Development Experience: Centralize all UI reloads to be able to shotgun reloads, even if not visible on current page.
// ? TODO Post-MVP User Experience: Icons for daily quests will be different for available quests, completed but not fully capped out, and capped out state.

// ? TODO Post-MVP: Explore bootstrap off-canvas instead of sidebar (could remove dependency on jQuery)

const rewardStoreLoad = () => {
    
    let rewards = alasql("SELECT * FROM " + RewardBPTableName + " ORDER BY rewardCost")
    if (rewards.length <= 0) {
        console.log("No rewards available");
    }
    
    let rewardList = document.getElementById("reward-store-list");
    rewardList.replaceChildren();

    for (let i = 0; i < rewards.length; i++) {

        let rewardCardHtml = "<div class=\"card-body\">";
        rewardCardHtml += "<h5 class=\"card-title\">" + rewards[i].rewardName + " ";
        rewardCardHtml += "<span class=\"badge bg-warning\"> Price: " + rewards[i].rewardCost;
        rewardCardHtml += " points</span></h5>"
        rewardCardHtml += "<p>" + rewards[i].rewardDescription + "</p>";
        rewardCardHtml += "<form class='reward-button-form' onsubmit='buyReward(\""+ rewards[i].rewardId +"\")'>";
        rewardCardHtml += "<button class=\"btn-sm btn-primary\">Buy reward</button>";
        rewardCardHtml += "</form>";
        rewardCardHtml += "</div>";

        let rewardDiv = document.createElement("div");
        rewardDiv.classList.add("card", "reward-card");
        rewardDiv.innerHTML = rewardCardHtml;

        rewardList.appendChild(rewardDiv);
    }

}

const buyReward = rewardId => {

    let reward = alasql("SELECT * FROM " + RewardBPTableName + " WHERE rewardId = ? LIMIT 1", [rewardId])
    if (reward.length != 1) {
        console.log("Error retrieving reward information. Tell user somehow");
        return; // no return-false, because in this case, UI actually needs to be updated
    }
    reward = reward[0];

    let userConfirmed = confirm("Do you really want to purchase '"+reward.rewardName +"' reward?");
    if (userConfirmed) {
        let userPrefs = Util.getUserPrefs();

        // Check user has sufficient funds to purchase        
        if (userPrefs.userData.currency - reward.rewardCost >= 0) {
            userPrefs.userData.currency -= reward.rewardCost;
            Util.saveUserPrefs(userPrefs);
        } else {alert("Not enough money");}

        reloadUserPrefsDisplayElements();
    }

    rewardStoreLoad();
    return false;
}

const getDailyQuests = () => {
    let todayDate = new Date();
    todayDate.setHours(0,0,0);
    let todayStart = Util.getSecondsSinceEpoch(new Date(todayDate));
    todayDate.setHours(23, 59, 59);
    let todayEnd = Util.getSecondsSinceEpoch(new Date(todayDate));

    return alasql("SELECT * FROM " + QuestsTableName + " WHERE activeStart BETWEEN ? AND ? AND activeEnd BETWEEN ? AND ? AND questStatus == 'ASSIGNED'", [todayStart, todayEnd, todayStart, todayEnd]);
}

const dailyQuestsLoad = () => {
    let todaysQuests = getDailyQuests();

    console.log("Quests available for today:")
    console.log(todaysQuests);

    // display them in the list
    let dailyQuestsList = document.getElementById("daily-quests-pane");
    dailyQuestsList.replaceChildren();
    for (let i = 0; i < todaysQuests.length; i++) {
        let dailyQuest = todaysQuests[i];
        let dailyQuestBlueprint = alasql("SELECT * FROM " + QuestsBPTableName + " WHERE questId=?", [dailyQuest.questBlueprintId])

        if (dailyQuestBlueprint.length < 1) {
            console.log("Daily quest blueprint for " + dailyQuest.questId + " not found in database. Skipping.");
            continue;
        }
        dailyQuestBlueprint = dailyQuestBlueprint[0];

        let questCardHtml = "<div class=\"card-body\">";
        questCardHtml += "<h5 class=\"card-title\">" + dailyQuestBlueprint.questName + " ";
        questCardHtml += "<span class=\"badge bg-secondary\">" + dailyQuestBlueprint.questRewardAmount;
        questCardHtml += " points</span>";
        questCardHtml += "</h5>";
        questCardHtml += "<p>" + dailyQuestBlueprint.questDescription + "</p>";
        questCardHtml += "<form class='quest-button-form' onsubmit='dailyQuestAbandonForm(\""+dailyQuest.questId+"\")'>";
        questCardHtml += "<button class=\"btn-sm btn-danger\">Abandon</button>";
        questCardHtml += "</form>";
        questCardHtml += "<form class='quest-button-form' onsubmit='dailyQuestTurnInForm(\""+dailyQuest.questId+"\")'>";
        questCardHtml += "<button class=\"btn-sm btn-primary\">Turn in</button>";
        questCardHtml += "</form>";
        questCardHtml += "</div>";

        let questDiv = document.createElement("div");
        questDiv.classList.add("card", "daily-quest-card");
        questDiv.innerHTML = questCardHtml;

        dailyQuestsList.appendChild(questDiv);
    }

}

const dailyQuestTurnInForm = dailyQuestId => {
    let userConfirmed = confirm("Are you sure you want to turn in the quest at this time?");
    
    let dailyQuest = alasql("SELECT * FROM " + QuestsTableName + " WHERE questId=?", [dailyQuestId])
    if (dailyQuest.length < 1) {
        console.log("ERROR: Requested daily quest completion for quest that doesn't exist anymore.")
        return;
    }
    dailyQuest = dailyQuest[0];
    
    if (userConfirmed) {
        // update quest status to complete
        let rowsUpdated = alasql("UPDATE " + QuestsTableName + " SET questStatus='COMPLETED' WHERE questId=?", [dailyQuestId]);
        console.log("Updated " + rowsUpdated + " rows in quests table.");

        // now give user points for completing the quest
        
        
        let dailyQuestBP = alasql("SELECT * FROM " + QuestsBPTableName + " WHERE questId=?", [dailyQuest.questBlueprintId])
        if (dailyQuestBP < 1) {
            console.log("ERROR: Requested blueprint that no longer exists. Cannot continue - skipping.");
            return;
        }
        dailyQuestBP = dailyQuestBP[0];
        
        let userPrefs = Util.getUserPrefs();
        userPrefs.userData.currency += dailyQuestBP.questRewardAmount;
        Util.saveUserPrefs(userPrefs);
        

        reloadUserPrefsDisplayElements();
    }

    dailyQuestsLoad();
    return false;
}

const dailyQuestAbandonForm = dailyQuestId => {
    let userConfirmed = confirm("Are you sure you want to abandon this quest? You can always take the quest again at later time, but any progress made until now on the quest will not be recognized.");
    
    let dailyQuest = alasql("SELECT * FROM " + QuestsTableName + " WHERE questId=?", [dailyQuestId])
    if (dailyQuest.length < 1) {
        console.log("ERROR: Requested daily quest completion for quest that doesn't exist anymore.")
        return;
    }
    dailyQuest = dailyQuest[0];

    if (userConfirmed) {
        // update quest status to ABANDONED
        let rowsUpdated = alasql("UPDATE " + QuestsTableName + " SET questStatus='ABANDONED' WHERE questId=?", [dailyQuestId]);
        console.log("Updated " + rowsUpdated + " rows in quests table.");

        // ? TODO Post-MVP: Determine what logic should come here - what to do with abandons etc.

        reloadUserPrefsDisplayElements();
    }

    dailyQuestsLoad();
    return false;
}

const reloadUserPrefsDisplayElements = () => {
    let userPrefs = Util.getUserPrefs();
    document.getElementById("display-username").innerText = userPrefs.userData.name;
    document.getElementById("display-currency").innerText = userPrefs.userData.currency;
}

const attachFormSubmitListeners = () => {
    let addQuestFormElement = document.getElementById("add-quest-form");
    let addRewardFormElement = document.getElementById("add-reward-form");

    addQuestFormElement.addEventListener("submit", addQuestFormSubmit);
    addRewardFormElement.addEventListener("submit", addRewardFormSubmit); 
}

const attachUIElementListeners = () => {
    // Links in the side menu
    let menuLinks = document.querySelectorAll("a.nav_link[href='#']");
    menuLinks.forEach((link, index, _) => {
        link.addEventListener("click", (event) => {
            // Sometimes user clicks the icon (<i>) and that is the event target
            // I need to check whether clicked tag was <a> or <i>, and if <i>
            // the use parent to identify activeLinkName 
            let linkTarget = event.target;
            if (event.target.tagName.toLowerCase() == "i") {
                linkTarget = event.target.parentElement;
                console.log("User clicked the <i> element, moving target to its parent.")
            }
            displayPage(linkTarget.textContent.trim());
        });
    });

    // Attach "add quests randomly listener"
    document.getElementById("add-quests-randomly-form").addEventListener("submit", addQuestsRandomly);
}

const questManagerLoadList = () => {
    let quests = alasql("SELECT * FROM " + QuestsBPTableName + " ORDER BY questName")
    let managerQuestList = document.getElementById("quest-manager-quest-list");
    
    managerQuestList.replaceChildren();
    for (let i = 0; i < quests.length; i++) {
        let tr = document.createElement("tr");

        let trHtmlContents = "<td>" + quests[i].questName + "</td>"
        trHtmlContents += "<td>" + quests[i].questDescription + "</td>"
        trHtmlContents += "<td>"+ quests[i].questRewardAmount +"</td>"
        trHtmlContents += "<td><form onsubmit='managerQuestRemove(\"" + quests[i].questId + "\")'><button class='btn btn-sm btn-danger' value='remove'>❌</button><form></td>"
        
        tr.innerHTML = trHtmlContents;
        managerQuestList.appendChild(tr);
    }

    // In a same manner, populate the modal for adding quests
    let addQuestSelectionList = document.getElementById("add-quests-by-selection");

    addQuestSelectionList.replaceChildren();
    for (let i = 0; i < quests.length; i++) {
        let liElement = document.createElement("li");
        liElement.classList.add("list-group-item");

        liHtmlContent = "<a class='btn btn-small btn-success' href='#' onclick='addQuestByBlueprintId(\""+quests[i].questId+"\")'>Add</a>"
        liHtmlContent += "  <strong>" + quests[i].questName + "</strong> <br>";
        liHtmlContent += quests[i].questDescription

        liElement.innerHTML = liHtmlContent

        addQuestSelectionList.appendChild(liElement);
    }
}

const rewardManagerLoadList = () => {
    let rewards = alasql("SELECT * FROM " + RewardBPTableName + " ORDER BY rewardName");
    let managerRewardList = document.getElementById("reward-manager-rewards-list");

    managerRewardList.replaceChildren();
    for (let i = 0; i < rewards.length; i++) {
        let tr = document.createElement("tr");
        
        let trHtmlContents = "<td>" + rewards[i].rewardName + "</td>";
        trHtmlContents += "<td>" + rewards[i].rewardDescription + "</td>";
        trHtmlContents += "<td>" + rewards[i].rewardCost + "</td>";
        trHtmlContents += "<td><form onsubmit='managerRewardRemove(\"" + rewards[i].rewardId + "\")'><button class='btn btn-sm btn-danger'>❌</form></td>";
        
        tr.innerHTML = trHtmlContents;
        managerRewardList.appendChild(tr);
    }
}

const managerQuestRemove = questId => {
    console.log("Attempting to remove quest with ID " + questId);

    let rowsDeleted = alasql("DELETE FROM " + QuestsBPTableName + " WHERE questId=?", questId);
    console.log("Deleted "+rowsDeleted+" rows");

    questManagerLoadList();
}

const managerRewardRemove = rewardId => {
    console.log("Attemptingto remove reward with ID " + rewardId);

    let rowsDeleted = alasql("DELETE FROM " + RewardBPTableName + " WHERE rewardId=?", rewardId);
    console.log("Deleted "+rowsDeleted+" rows");

    rewardManagerLoadList();
}

const addRewardFormSubmit = event => {
    event.preventDefault();
    
    let formValues = Util.collectFormInputtedValues("add-reward-form");

    let rowsInserted = alasql("INSERT INTO " + RewardBPTableName + " (rewardId, rewardName, rewardDescription, rewardCost) VALUES (?, ?, ?, ?)", [crypto.randomUUID(), formValues["add-reward-name"], formValues["add-reward-description"], formValues["add-reward-cost"]]);
    console.log("Inserted " + rowsInserted + " records into " + RewardBPTableName);
    
    Util.resetForm("add-reward-form");
    rewardManagerLoadList();
    rewardStoreLoad();
}


const addQuestFormSubmit = event => {
    event.preventDefault();

    let formValues = Util.collectFormInputtedValues("add-quest-form");

    // TODO Post-MVP: Use lookup for Category guid, as opposed to hardcoding the name
    let rowsInserted = alasql("INSERT INTO " + QuestsBPTableName + " (questId, questName, questDescription, questRewardAmount, questCategory) VALUES (?, ?, ?, ?, ?)", [crypto.randomUUID(), formValues["add-quest-name"], formValues["add-quest-description"], formValues["add-quest-reward-amount"], formValues["add-quest-category-select"]]);

    console.log("Inserted " + rowsInserted + " records into " + QuestsBPTableName)

    Util.resetForm("add-quest-form");
    questManagerLoadList();
}

const closeModal = modalId => {
    $('#'+modalId).modal("hide");
}

// TBD: Function to add quests that are not added yet?

const addQuestsRandomly = event => {
    event.preventDefault();

    console.log("Called add quests randomly")
    let howManyQuests = document.getElementById("add-quests-randomly-amount");
    howManyQuests = parseInt(howManyQuests.value);
    console.log("User wants to randomly add " + howManyQuests + " quests")

    // Get quests already scheduled for today
    let todayQuests = getDailyQuests();
    let todayQuestsGuids = [];
    for (let i = 0; i < todayQuests.length; i++) {
        todayQuestsGuids.push(todayQuests[i].questBlueprintId);
    }
    console.log("Quests already scheduled for today:" + todayQuests);

    // Get all quests blueprints that are not scheduled for today
    let questNotCompletedToday = alasql("SELECT * FROM " + QuestsBPTableName + " WHERE questId NOT in @(?)", [todayQuestsGuids]);
    let notCompletedTodayGuids = [];
    for (let i = 0; i < questNotCompletedToday.length; i++) {
        notCompletedTodayGuids.push(questNotCompletedToday[i].questId);
    }
    console.log("Quests not schedulde for today: ");
    console.log(questNotCompletedToday)
    console.log(notCompletedTodayGuids);
    if (notCompletedTodayGuids.length == 0) {
        console.log("Can't add more quests, because everything was already completed today.");
        closeModal("select-quest-modal");
        return;
    }

    // Randomly select quest blueprint IDs to be added
    // FYI: If there is a request to add more quests than there is in quests available
    // (or than there is "not completed today" quests completed), only uncompleted quests
    // will be added and application doesn't report it. Possible usability thing.
    let questsToAdd = [];
    for (let i = 0; i < howManyQuests; i++) {
        console.log("quests to add loop")
        let randomQuestGuid = Util.randomChoice(notCompletedTodayGuids);
        questsToAdd.push(randomQuestGuid);

        let toRemove = notCompletedTodayGuids.indexOf(randomQuestGuid);
        notCompletedTodayGuids.splice(toRemove, 1);

        if (notCompletedTodayGuids.length == 0) {
            console.log("Can't add more quests, because everything was already completed today.");
            break;
        }
    }
    console.log("quests to add:" + questsToAdd)
    console.log("quests to add length= " + questsToAdd.length)

    // Go through quest to add Ids and insert them into daily quests
    let todayDate = new Date();
    todayDate.setHours(0,0,0);
    let todayStart = Util.getSecondsSinceEpoch(new Date(todayDate));
    todayDate.setHours(23, 59, 59);
    let todayEnd = Util.getSecondsSinceEpoch(new Date(todayDate));

    for (let i = 0; i < questsToAdd.length; i++) {
        console.log("adding quests loop, i=" + i + ",questsToaddLength="+questsToAdd.length);
        let questId = crypto.randomUUID();
        let questBlueprintId = questsToAdd[i];
        let questActiveStart = todayStart;
        let questActiveEnd = todayEnd;
        let questStatus = "ASSIGNED";

        let insertedRows = alasql("INSERT INTO " + QuestsTableName + "(questId, questBlueprintId, activeStart, activeEnd, questStatus) VALUES (?, ?, ?, ?, ?)", [questId, questBlueprintId, questActiveStart, questActiveEnd, questStatus]);

        console.log("Inserted rows=" + insertedRows)

    }
    closeModal("select-quest-modal");
    dailyQuestsLoad();
}

// function to add quest by id
const addQuestByBlueprintId = blueprintId => {
    let blueprint = alasql("SELECT * FROM "  + QuestsBPTableName + " WHERE questId = ?", [blueprintId]);
    if (blueprint.length < 1){
        console.log("No quest blueprint with ID " + blueprintId)
        return;
    }
    blueprint = blueprint[0];

    let questId = crypto.randomUUID();
    let questBlueprintId = blueprint.questId;
    let questActiveStart = Util.getDayStartEnd(new Date())[0];
    let questActiveEnd = Util.getDayStartEnd(new Date())[1];
    let questStatus = "ASSIGNED";

    let insertedRows = alasql("INSERT INTO " + QuestsTableName + "(questId, questBlueprintId, activeStart, activeEnd, questStatus) VALUES (?, ?, ?, ?, ?)", [questId, questBlueprintId, questActiveStart, questActiveEnd, questStatus]);

    console.log("Inserted rows=" + insertedRows)
    closeModal("select-quest-modal");
    dailyQuestsLoad();
}


const updateDailyQuestsTimeRemaining = () => {
    // Get current date and time in seconds since epoch
    let todayDate = new Date();
    let currentTimeSeconds = Util.getSecondsSinceEpoch(todayDate);
    todayDate.setHours(23, 59, 59);

    let todayEndTimeSeconds = Util.getSecondsSinceEpoch(todayDate);
    let secondsTillDayEnds = todayEndTimeSeconds - currentTimeSeconds;

    let countDown = document.getElementById("daily-quests-time-remaining");
    let readable = Util.secondsToHumanReadableTimeRemaining(secondsTillDayEnds);
    
    // daily = 0d - we dont need that part
    countDown.innerText = readable.substr(2); 
}


const getActiveLinkName = () => {
    let links = document.querySelectorAll(".nav_link");
    for (let l = 0; l < links.length; l++) {
        if (links[l].classList.contains("active")) {
            return links[l].textContent.trim();
        }
    }

    return undefined;
}










main()