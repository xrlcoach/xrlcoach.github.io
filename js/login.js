function login(event) {
    event.preventDefault();
    var username = document.getElementById('username').value;
    var password = document.getElementById('password').value;

    fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/xrl-users/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*'                
    },
    credentials: 'include',
    body: JSON.stringify({
        "username": username,
        "password": password,        
    })
    })
    .then((response) => {
        if (response.ok) {
            for (let i of response.headers.entries()) {
                console.log(i);
            }
            var setCookie = response.headers.get('Set-Cookie');
            var cookie = document.cookie;
            var body = response.json()
            return body;
        } else {
            document.getElementById('feedback').innerText = 'Network response not ok';
        }        
    })
    .then((data) => {
        document.cookie = `id=${data}; Secure`;
        window.location.href = './index.html';
    })
    .catch((error) => {
        document.getElementById('feedback').innerText += error;
    })
}