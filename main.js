class FileInfo {
    constructor(spreadsheetID, filesList, dataFileName, values){
        this.ID = spreadsheetID;
        this.filesList = filesList;
        this.dataFileName = dataFileName;
        this.values = values;
    }
}

let fileInfo = new FileInfo("", null, "", []);

function handleClientLoad(){
    // Load client library and auth2 library
    gapi.load('client:auth2', initClient);
}

function initClient(){

    // List scopes that'll be used
    var SCOPES = 'profile';
    SCOPES += ' https://www.googleapis.com/auth/spreadsheets';
    SCOPES += ' https://www.googleapis.com/auth/drive';

    // Init client with keys/ID and scopes
    gapi.client.init({
        apiKey: 'AIzaSyAMKD2YshpfjbaSQLtb98TKd-x0XNiagPk',
        discoveryDocs: [
            "https://people.googleapis.com/$discovery/rest?version=v1",
            "https://sheets.googleapis.com/$discovery/rest?version=v4",
            "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"
        ],
        clientId: '810924479095-57q43clu2lk7nafnpflgig25v86u46co.apps.googleusercontent.com',
        scope: SCOPES
    }).then(function(){
        // List for sign-in state changes
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSignInStatusAsync);

        // Handle initial sign in
        updateSignInStatusAsync(gapi.auth2.getAuthInstance().isSignedIn.get());
    });

}

async function updateSignInStatusAsync(isSignedIn){
    // If signed in, call the API to get spreadsheet data
    // and also update the page with the data
    if(isSignedIn){
        $('#signin-button').css("display", "none");
        $('#signout-button').css("display", "inline");

        const userNameAndFilesList = await new Promise(function(resolve, reject){
            // Get the name of the user to display somewhere on screen
            gapi.client.people.people.get({
                'resourceName' : 'people/me',
                'requestMask.includeField' : 'person.names'
            }).then(function(response){
                name = response.result.names[0].givenName;
                fileInfo.dataFileName = 'countCal_' + name;
            }, function(reason){
                console.log('Error: ' + reason.result.error.message);
            }).then(function(){
                // Get a list of all the filenames on the users Drive
                gapi.client.drive.files.list().then(function(response){
                    console.log(response.status);
                    switch(response.status){
                        case 200:
                            fileInfo.filesList = response.result.files;
                            break;
                        default:
                            console.log('Error in search ' +response);
                            break;
                    }
                    resolve('Finished: Getting name and getting files list');
                });
            });
        });
        console.log(fileInfo.dataFileName);

        // Check if file is in fact found
        if(fileInfo.filesList != null && fileInfo.filesList != undefined){
            console.log(fileInfo);
            console.log("reached");

            // Check if the file we need is located on the drive
            var foundFile = fileInfo.filesList.find(function(element){
                return element.name == fileInfo.dataFileName;
            });
            
            // Set the ID of the file
            if(foundFile != undefined){
                fileInfo.ID = foundFile.id;
            }
        }

        // If a file ID is not found, make a new file
        if(fileInfo.ID == ""){
            const createFile = new Promise(function(resolve, reject){
                var fileMetadata = {
                    'name' : fileInfo.dataFileName,
                    'mimeType' : 'application/vnd.google-apps.spreadsheet'
                };

                // Make the file if it is not found
                gapi.client.drive.files.create({
                    resource: fileMetadata,
                }).then(function(response) {
                    switch(response.status){
                    case 200:
                        var file = response.result;
                        console.log('Created Spreadsheet Id: ', file.id);
                        fileInfo.ID = file.id;
                        break;
                    default:
                        console.log('Error creating the folder, '+response);
                        break;
                    }
                    resolve("Finished file creation.");
                });
            });
        }
        console.log(fileInfo);

        // Update file values. Data is in form:
        // Event name, date
        const updateFile = await new Promise(function(resolve, reject){
            // Get the file data and save it into the fileInfo.values variable
            gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: fileInfo.ID,
                range: "A:D"
            }).then(function(response){
                fileInfo.values = response.result.values;
                resolve("Updated file values.");
            });
        });
        console.log(fileInfo.values);

        // Show the countdown list
        $("#countdown_list").css("display", "inline");

        // Create the rows that will display times
        for(var i = 0; i < fileInfo.values.length; i++){
            var row = document.getElementById("countdown_table").insertRow(i);
            row.id = "countdown_row_" + i;
            row.classList.add('countdown_row');
        }

        // Setup all timer displays
        var x = setInterval(function(){

            for(var i = 0; i < fileInfo.values.length; i++){
                var date = new Date(fileInfo.values[i][1]);
                var time = date.getTime();

                var dateMin = date.getMinutes();
                var dateHour = date.getHours();
                if(dateMin < 10) dateMin = '0' + dateMin;

                var event = fileInfo.values[i][0] + " : " + date.toDateString() + " at " + dateHour + ":" + dateMin;

                var row = document.getElementById("countdown_row_" + i);

                var now = new Date().getTime();

                var distance = time - now;

                var days = Math.floor(distance / (1000 * 60 * 60 * 24));
                var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                var seconds = Math.floor((distance % (1000 * 60)) / 1000);

                if(seconds < 10) seconds = '0' + seconds;
                if(minutes < 10) minutes = '0' + minutes;
                if(hours < 10) hours = '0' + hours;

                row.innerHTML = "<p class=\"time\">" + days + ":" + hours + ":" + minutes + ":" + seconds + "</p>" ;
                row.innerHTML += "<p class=\"event\"> " + event + "</p>";

                if(distance < 0){
                    row.innerHTML = "DONEZO";
                }
            }   

        }, 1000);

    }
}

// Function triggered by Sign In button
function handleSignInClick(event){
    console.log("Sign In Clicked");
    gapi.auth2.getAuthInstance().signIn();
    // $('#signin-button').css("display", "none");
    // $('#signout-button').css("display", "inline");
}

// Function triggered by Sign Out button
function handleSignOutClick(event) {
    console.log("Sign Out Clicked");
    gapi.auth2.getAuthInstance().signOut();
    $('#signin-button').css("display", "inline");
    $('#signout-button').css("display", "none");

    $('#countdown_table').empty();

}