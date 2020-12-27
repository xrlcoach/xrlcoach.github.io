let roundNumber, homeTeam, awayTeam, homeLineup, awayLineup;

window.onload = async function() {
    let query = window.location.href.split('?')[1];
    let queries = query.split('&');
    for (let q of queries) {
        if (q.startsWith('round')) {
            roundNumber = q.split('=')[1];
        }
        if (q.startsWith('fixture')) {
            let fixture = q.split('=')[1];
            homeTeam = fixture.split('-v-')[0];
            awayTeam = fixture.split('-v-')[1];
        }
    }
    
}