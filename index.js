var fs = require("fs");
var readline = require("readline");
var google = require("googleapis");
var googleAuth = require("google-auth-library");
const dotenv = require("dotenv");
dotenv.config();

var SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
var TOKEN_DIR =
    (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) +
    "/.credentials/";
var TOKEN_PATH = TOKEN_DIR + "gmail-nodejs-quickstart.json";

// Load client secrets from a local file.
fs.readFile("client_secret.json", function processClientSecrets(err, content) {
    if (err) {
        console.log("Error loading client secret file: " + err);
        return;
    }

    authorize(JSON.parse(content), autoReply);
});

function authorize(credentials, callback) {
    var clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    var clientId = process.env.GOOGLE_CLIENT_ID;
    var redirectUrl = "http://localhost:3000/auth/google/callback";
    var auth = new googleAuth();
    var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function(err, token) {
        if (err) {
            getNewToken(oauth2Client, callback);
        } else {
            oauth2Client.credentials = JSON.parse(token);
            callback(oauth2Client);
        }
    });
}

function getNewToken(oauth2Client, callback) {
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
    });
    console.log("Authorize this app by visiting this url: ", authUrl);
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question("Enter the code from that page here: ", function(code) {
        rl.close();
        oauth2Client.getToken(code, function(err, token) {
            if (err) {
                console.log("Error while trying to retrieve access token", err);
                return;
            }
            oauth2Client.credentials = token;
            storeToken(token);
            callback(oauth2Client);
        });
    });
}

function storeToken(token) {
    try {
        fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
        if (err.code != "EEXIST") {
            throw err;
        }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token));
    console.log("Token stored to " + TOKEN_PATH);
}

function listLabels(auth) {
    var gmail = google.gmail("v1");
    gmail.users.labels.list({
            auth: auth,
            userId: "me",
        },
        function(err, response) {
            if (err) {
                console.log("The API returned an error: " + err);
                return;
            }
            var labels = response.labels;
            if (labels.length == 0) {
                console.log("No labels found.");
            } else {
                console.log("Labels:");
                for (var i = 0; i < labels.length; i++) {
                    var label = labels[i];
                    if (label.name === "INBOX") {
                        console.log(label);
                    }
                }
            }
        }
    );
}

function autoReply(auth) {
    var gmail = google.gmail("v1");
    gmail.users.messages.list({
            auth: auth,
            userId: "me",
        },
        (err, res) => {
            if (!err) {
                const { messages } = res;
                messages.map((msg, i) => {
                    // if (i) {
                    gmail.users.messages.get({
                            auth: auth,
                            userId: "me",
                            id: msg.id,
                        },
                        (err, res) => {
                            if (!err) {
                                res.payload.headers.map((head) => {
                                    if (head.name == "From") {
                                        // Display list of all senders
                                        console.log(head.value);
                                    }
                                });
                            }
                        }
                    );
                    // }
                });
            }
        }
    );
}