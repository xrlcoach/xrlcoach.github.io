import { GetActiveUserInfo, GetCurrentRoundInfo, Login } from "./ApiFetch.js";

async function login(event) {
    event.preventDefault();
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
    window.location.href = './index.html';
}

window.login = login;