from datetime import datetime
import boto3
from boto3.dynamodb.conditions import Key, Attr

dynamodbClient = boto3.client('dynamodb', 'ap-southeast-2')
dynamodbResource = boto3.resource('dynamodb', 'ap-southeast-2')
stats_table = dynamodbResource.Table('stats2020')
squads_table = dynamodbResource.Table('players2020')
users_table = dynamodbResource.Table('users2020')
lineups_table = dynamodbResource.Table('lineups2020')
rounds_table = dynamodbResource.Table('rounds2020')

print(f"Script executing at {datetime.now()}")

resp = rounds_table.scan(
    FilterExpression=Attr('completed').eq(False) & Attr('in_progress').eq(True)
)
current_round = resp['Items'][0]
round_number = current_round['round_number']
print(f"Finalising Round {round_number}")
fixtures = current_round['fixtures']

for match in fixtures:
    print(f"Finalising {match['home']} v {match['away']}")
    for team in match:
        print(f"Finalising {team} lineup")
        resp = lineups_table.scan(
            FilterExpression=Attr('xrlTeam+round').eq(team + round_number)
        )
        lineup = resp['Items']
        captain_count = len([player for player in lineup if player['captain']])
        powerplay = captain_count > 1
        print(f"Captain count is {captain_count}, powerplay is {powerplay}")
        starters = [player for player in lineup if not player['position_specific'].startswith('int')]
        print(f"Starters: {starters}")
        bench = [player for player in lineup if player['position_specific'].startswith('int')]
        print(f"Bench: {bench}")
        substitutions = 0
        for player in starters:
            




""" db.execute("SELECT home_team, away_team FROM xrl_draw WHERE round_number = ?", (current_round,))
matches = db.fetchall()
for match in matches:
    print(f"Finalising {match[0]} v {match[1]}")
    for team in match:
        db.execute("SELECT COUNT(*) FROM "+team+str(current_round)+"_lineup WHERE captain=1")
        captain_count = db.fetchone()[0]
        if captain_count > 1:
            db.execute("UPDATE xrl_users SET powerplay = powerplay + 1 WHERE team_short = ?", (team,))
        print(f"{team} substitions:")
        db.execute("SELECT lineup_player_name, lineup_nrl_team, lineup_position FROM "+team+str(current_round)+"_lineup WHERE interchange IS NULL")
        lineup = db.fetchall()
        subs = 0
        db.execute("SELECT COUNT(*) FROM "+team+str(current_round)+"_lineup WHERE interchange IS NOT NULL")
        bench_count = db.fetchone()[0]
        for player in lineup:
            db.execute("SELECT player_name FROM "+round_table+" WHERE player_name=? AND nrl_team=?", (player[0], player[1]))
            appearance = db.fetchone()
            if appearance == None:
                valid_sub = False
                if subs == bench_count:
                    print(f"{player[0]} didn't play. No more subs available.")
                    db.execute("UPDATE "+team+str(current_round)+"_lineup SET interchange=5 WHERE lineup_player_name=? AND lineup_nrl_team=?", (player[0], player[1]))
                    continue
                db.execute("SELECT lineup_player_name, interchange, lineup_position, lineup_position2 FROM "+team+str(current_round)+"_lineup WHERE interchange IS NOT NULL AND interchange < 5")
                for i in range(bench_count - subs):
                    interchange = db.fetchone()
                    if interchange[2] == player[2] or interchange[3] == player[2]:
                        print(f"{player[0]} didn't play. Subbing in {interchange}")
                        db.execute("UPDATE "+team+str(current_round)+"_lineup SET interchange=5 WHERE lineup_player_name=? AND lineup_nrl_team=?",
                                    (player[0], player[1]))
                        db.execute("UPDATE "+team+str(current_round)+"_lineup SET interchange=NULL WHERE interchange=?", (interchange[1],))
                        valid_sub = True
                        subs += 1
                        break
                if not valid_sub:
                    print(f"{player[0]} didn't play. No sub available in that position.")
                    db.execute("UPDATE "+team+str(current_round)+"_lineup SET interchange=5 WHERE lineup_player_name=? AND lineup_nrl_team=?", (player[0], player[1]))


    conn.commit()
    db.execute("SELECT SUM(lineup_score) FROM "+match[0]+str(current_round)+"_lineup WHERE interchange IS NULL")
    home_score = db.fetchone()[0]
    db.execute("SELECT SUM(lineup_score) FROM "+match[1]+str(current_round)+"_lineup WHERE interchange IS NULL")
    away_score = db.fetchone()[0]
    if home_score > away_score:
        db.execute("UPDATE xrl_users SET wins=wins+1, for=for+?, against=against+?, points=points+2 WHERE team_short=?",
                    (home_score, away_score, match[0]))
        db.execute("UPDATE xrl_users SET losses=losses+1, for=for+?, against=against+? WHERE team_short=?",
                    (away_score, home_score, match[1]))
    elif away_score > home_score:
        db.execute("UPDATE xrl_users SET wins=wins+1, for=for+?, against=against+?, points=points+2 WHERE team_short=?",
                    (away_score, home_score, match[1]))
        db.execute("UPDATE xrl_users SET losses=losses+1, for=for+?, against=against+? WHERE team_short=?",
                    (home_score, away_score, match[0]))
    else:
        db.execute("UPDATE xrl_users SET draws=draws+1, for=for+?, against=against+?, points=points+1 WHERE team_short=?",
                    (home_score, away_score, match[0]))
        db.execute("UPDATE xrl_users SET draws=draws+1, for=for+?, against=against+?, points=points+1 WHERE team_short=?",
                    (away_score, home_score, match[1])) """
    

db.execute("UPDATE rounds_played SET finalised=1 WHERE round_number=?", (current_round,))

conn.commit()
print("Update finalised")
conn.close()
