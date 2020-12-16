export function GetUserInfo(idToken) {
    return fetch('https://cyy6ekckwa.execute-api.ap-southeast-2.amazonaws.com/Test1/xrl-users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': idToken
        }
    })
}