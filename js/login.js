import { GetActiveUserInfo, GetCurrentRoundInfo, Login } from "./ApiFetch.js";
import { DisplayFeedback } from "./Helpers.js";

async function login(event) {
    event.preventDefault();
    try {
        document.getElementById('loading').hidden = false;
        var username = document.getElementById('username').value;
        var password = document.getElementById('password').value;    
        let idToken = await Login(username, password);       
        var expiry = new Date();
        expiry.setHours(expiry.getHours() + 6);
        document.cookie = `id=${idToken}; expiry=${expiry.toUTCString()}; Secure`;
        let roundInfo = await GetCurrentRoundInfo();
        document.cookie = `round=${roundInfo.round_number}; expires=${expiry.toUTCString()}; Secure`;
        let activeUser = await GetActiveUserInfo(idToken);
        document.cookie = `team=${activeUser.team_short}; expires=${expiry.toUTCString()}; Secure`;
        document.getElementById('loading').hidden = true;
        window.location.href = './index.html';
    } catch (err) {
        document.getElementById('loading').hidden = true;
        DisplayFeedback('Error', err);
    }
}

window.login = login;