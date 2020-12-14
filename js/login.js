function login(event) {
    event.preventDefault();
    var username = document.getElementById('username').value;
    var password = document.getElementById('password').value;

    fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/xrl-users/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',                
    },
    credentials: 'include',
    body: JSON.stringify({
        "username": username,
        "password": password,        
    })
    })
    .then((response) => {
        if (response.ok) {
            var headers = response.headers;
            var setCookie = response.headers.get('Set-Cookie');
            var cookie = document.cookie;
            var body = response.json()
            window.location.href = './index.html';
        } else {
            document.getElementById('feedback').innerText = 'Network response not ok';
        }        
    })
    .catch((error) => {
        document.getElementById('feedback').innerText += error;
    })
}