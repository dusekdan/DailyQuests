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
        let gameStateStruct = { rewardStore: {rewards: [], purchase: []}, userData: { name: "Armored Lynx", currency: 200, dailyQuestsLimit: 25, dailyQuestsCategoryLimits: [{categoryId: undefined, limit: 10}]}, uiData: {lastOpenedPage: "Daily Quests"}, seeded: false }

        localStorage.setItem("GameState", JSON.stringify(gameStateStruct));
    }

    let gameState = JSON.parse(localStorage.getItem("GameState"))
    // TODO: Implement validation and seeding logic

    if (gameState.seeded == undefined || gameState.seeded == false){
        let seeding = {
            "quests": [
                ["654f5042-11fe-477e-8429-974e467154bc", "5K Run", "Go out and get a 5K run in.", 250, "Default"],
                ["e3b96c02-11a9-4400-9d0d-48eb7b91613a", "10K Run", "Go out and get a 10 run in.", 600, "Default"],
                ["bc61b965-868d-4828-83f5-d257f55f1458", "Clean up workspace", "Wherever you conduct your work from, make sure it's well organized.", 80, "Default"],
                ["39433db3-0da4-45e9-acde-c6c688f5a746", "Brush your teeth (morning)", "", 20, "Default"],
                ["8a882a79-bb4f-4e06-8bcc-80f9bbfbb2ea", "Brush your teeth (evening)", "", 20, "Default"],
                ["d0dfad73-bca8-4eda-a7e3-b5960d085e1e", "60 minutes of sweat and lift.", "Hit the gym for a minimum of 60 minutes. Yes, the warmup counts.", 300, "Default"],
                ["f9b0f9b5-acde-4795-ba48-14810741aefe", "Scholarly interest", "Go study something in your area of interest for 25 minutes.", 200, "Default"],
                ["19700e46-754a-47de-8753-f9b43f112928", "Academic potentiation", "Go study something in your area of interest for 60 minutes.", 500, "Default"],
                ["15420696-0116-49b4-b347-aabb66f3137b", "Laundry", "Today is the day. Do the laundry.", 50, "Default"],
                ["8e10fa78-a228-4940-a81d-0a506366a1a9", "Excursionist", "Go for a 2 kilometer walk.", 100, "Default"],
                ["55ae88be-3b51-4162-bafc-769027ec938f", "Journeyer", "Go for a 5 kilometer walk.", 300, "Default"],
                ["8596adfb-dac2-4940-bee6-5aa3d202096e", "Voyager", "Go for a 10 kilometer walk.", 700, "Default"],
                ["d1d35d06-74d3-4cc4-b1ba-354275da7b9e", "Globetrotter", "Go for a 25 kilometer walk.", 1800, "Default"]
            ],
            "rewards": [
                ["cf205d3f-cd62-49a7-ac67-0d48aced40c1", "1 Episode", "You can watch 1 episode of your favorite series.", 185],
                ["1d1c0388-28c4-44cd-ae47-4645dc3e3e19", "Watch a movie", "You can go watch a movie.", 250],
                ["8575913d-58f1-4ef0-87d0-fbef16749791", "Pizza Pass", "You are allowed to order and eat one whole pizza.", 500],
                ["c7131dab-190b-4f8f-af37-6e265a0efa28", "Favorite drink", " You can buy yourself your favorite drink. Even if it's not exactly a healthy drink.", 330],
                ["94c2fd6d-ae29-4815-abbd-c5735eb04881", "1 sleep-in pass", "Tomorrow, you don't have to wake up on time. Maybe it's because you want to go easy on you, maybe it's because you only arrived home from work late and there's no way you can sleep 8 hours if you fall asleep now. Either way, you have to buy the sleep-in pass.", 300],
                ["f405c1de-1068-418f-98ff-6f188d363e38", "Buy yourself a gift", "This is an example of a goal to work towards. You are encouraged to think of a thing you really want to buy yourself, but feel like you should deserve it first. Then set a high enough price for it in points, and make sure you do your daily quests to earn the points for it.", 15000]
            ]
        }
        console.log("Quests and rewards were not seeded. Will seed now.");

        for (let i = 0; i < seeding.quests.length; i++) {
            let questDefinition = seeding.quests[i];

            let rowsInserted = alasql("INSERT INTO " + QuestsBPTableName + " (questId, questName, questDescription, questRewardAmount, questCategory) VALUES (?,?,?,?,?)", questDefinition);
            console.log("Seeded " + rowsInserted + " quest");
        }

        for (let i = 0; i < seeding.rewards.length; i++) {
            let rewardDefinition = seeding.rewards[i];

            let rowsInserted = alasql("INSERT INTO " + RewardBPTableName + " (rewardId, rewardName, rewardDescription, rewardCost) VALUES (?,?,?,?)", rewardDefinition);
            console.log("Seeded " + rowsInserted + " reward");
        }

        gameState.seeded = true;
    } 
    Util.saveUserPrefs(gameState);

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

    // Check whether there's a need for daily quests being generated
    let HOW_MANY_QUESTS = 3;
    ensureDailyQuestGeneration(HOW_MANY_QUESTS);

    // Countdown init for daily quests page
    updateDailyQuestsTimeRemaining();
    setInterval(updateDailyQuestsTimeRemaining, 1000);

    // Set Import package event listener
    document.getElementById("importFileInput").addEventListener('change', importEverythingAndOverride);
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

const addQuestsRandomlyWithoutDuplicates = questCount => {
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
    for (let i = 0; i < questCount; i++) {
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
    let todayStart = Util.getDayStartEnd(new Date())[0];
    let todayEnd = Util.getDayStartEnd(new Date())[1];

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
}

const ensureDailyQuestGeneration = (questCount) => {
    let questsToday = getDailyQuests();

    if (questsToday.length < 1) {
        addQuestsRandomlyWithoutDuplicates(questCount);
    } else { console.log("Not pre-generating any daily quests because there are already quests for today."); }
    
    dailyQuestsLoad();
};

const getDailyQuests = () => {
    let todayStart = Util.getDayStartEnd(new Date())[0];
    let todayEnd = Util.getDayStartEnd(new Date())[1];

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

const addQuestsRandomly = event => {
    event.preventDefault();

    console.log("Called add quests randomly")
    let howManyQuests = document.getElementById("add-quests-randomly-amount");
    howManyQuests = parseInt(howManyQuests.value);
    console.log("User wants to randomly add " + howManyQuests + " quests")
    
    addQuestsRandomlyWithoutDuplicates(howManyQuests);

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


const exportEverything = () => {
    let exportString = JSON.stringify(window.localStorage);
        
    // Prepare download package
    const blob = new Blob([exportString], {type: "application/json"});
    const url = URL.createObjectURL(blob);

    // Timestamp one-liner, ideal candidate for Util.js module expansion TODO
    const timestamp = new Date().toISOString().slice(0,19).replace(/[-:T]/g, match => match === 'T' ? '_' : '');

    const downloadA = document.createElement('a');
    downloadA.href = url;
    downloadA.download = "dailyquests_exportpkg_" + timestamp + ".json"
    downloadA.click();
    downloadA.remove();
}


const importEverythingAndOverride = (event) => {

    const file = event.target.files[0];
    if (!file){
        return;
    }

    const reader = new FileReader();
    reader.onload = e => {
        const contents = e.target.result;
        console.log("File contents: ", contents);

        let importStringJson;
        try {
            importStringJson = JSON.parse(contents);
            console.log(importStringJson)
        } catch {
            console.log("Import string couldn't be parsed. No changes applied.");
            return;
        }

        console.log("Import file was parsed as JSON and will be imported.");

        window.localStorage.clear();
        for (const key in importStringJson) {
            window.localStorage.setItem(key, importStringJson[key]);
        }

        window.location.reload();
    };

    reader.readAsText(file);
}







main()