function logout() {
    document.cookie = "id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "round=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "team=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.replace('login.html');
}