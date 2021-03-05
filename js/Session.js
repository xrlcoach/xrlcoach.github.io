import { getCookie, GetCurrentRoundStatus } from './ApiFetch.js';

//Look for id cookie...
const idToken = getCookie('id');
//If there is no id cookie, redirect to login page
if (!idToken) window.location.replace('login.html');

/**
 * Clears session cookies and redirects to login page
 */
function logout() {
    document.cookie = "id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "round=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "team=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    sessionStorage.clear();
    window.location.replace('login.html');
}
window.logout = logout;

/**
 * Clears session storage and reloads page
 */
async function refresh() {
    sessionStorage.clear();
    var expiry = new Date();
    expiry.setHours(expiry.getHours() + 6);
    let roundInfo = await GetCurrentRoundStatus();
    sessionStorage.setItem('roundStatus', JSON.stringify(roundInfo));
    document.cookie = `round=${roundInfo.round_number}; expires=${expiry.toUTCString()}; Secure`;
    window.location.reload();
}
window.refresh = refresh;