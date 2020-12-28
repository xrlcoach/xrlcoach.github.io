import { GetCurrentRoundInfo, Login } from "./ApiFetch";

function login(event) {
    event.preventDefault();
    var username = document.getElementById('username').value;
    var password = document.getElementById('password').value;    
    let idToken = await Login(username, password);
    var now = new Date();
    var expiryTime = now.setHours(now.getHours() + 1);
    document.cookie = `id=${idToken}; expiry=${expiryTime.toUTCString()}; Secure`;
    let roundInfo = await GetCurrentRoundInfo();
    document.cookie = `round=${roundInfo.round_number}; expiry=${expiryTime.toUTCString()}; Secure`;
    window.location.href = './index.html';
}