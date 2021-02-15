import { GetActiveUserInfo, GetCurrentRoundInfo, Login } from "./ApiFetch.js";
import { DisplayFeedback } from "./Helpers.js";
/**
 * Logs in user and sets session info in cookies.
 * @param {*} event 
 */
async function login(event) {
    //Prevent form submission
    event.preventDefault();
    try {
        //Show loading icon
        document.getElementById('loading').hidden = false;
        //Get username and password inputs
        var username = document.getElementById('username').value;
        var password = document.getElementById('password').value; 
        //Call login function to authenticate user against cognito user pool   
        let idToken = await Login(username, password);      
        //Create an 6 hour expiry time for cookies 
        var expiry = new Date();
        expiry.setHours(expiry.getHours() + 6);
        //Set id cookie
        document.cookie = `id=${idToken}; expiry=${expiry.toUTCString()}; Secure`;
        //Get current active round and set as round cookie
        let roundInfo = await GetCurrentRoundInfo();
        document.cookie = `round=${roundInfo.round_number}; expires=${expiry.toUTCString()}; Secure`;
        //Get user's data and set team acronym as team cookie
        let activeUser = await GetActiveUserInfo(idToken);
        document.cookie = `team=${activeUser.team_short}; expires=${expiry.toUTCString()}; Secure`;
        document.getElementById('loading').hidden = true;
        //Redirect to home page
        window.location.href = './index.html';
    } catch (err) {
        //Catch and display any error messages
        document.getElementById('loading').hidden = true;
        DisplayFeedback('Error', err);
    }
}
window.login = login;