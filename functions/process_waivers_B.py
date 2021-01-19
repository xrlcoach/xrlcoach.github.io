import boto3
from boto3.dynamodb.conditions import Key, Attr
from datetime import date, datetime
import json
import decimal
import sys

log = open('logs/process_waivers.log', 'a')
sys.stdout = log
print(f"Script executing at {datetime.now().strftime('%c')}")
report = f"Script executing at {datetime.now().strftime('%c')}"

dynamodbResource = boto3.resource('dynamodb', 'ap-southeast-2')
squads_table = dynamodbResource.Table('players2020')
users_table = dynamodbResource.Table('users2020')
transfers_table = dynamodbResource.Table('transfers2020')
rounds_table = dynamodbResource.Table('rounds2020')
waivers_table = dynamodbResource.Table('waivers2020')

resp = rounds_table.scan(
    FilterExpression=Attr('active').eq(True)
)
round_number = max([r['round_number'] for r in resp['Items']])
print(f"Current XRL round: {round_number}. Second round of waivers.")
report += f"\nCurrent XRL round: {round_number}. Second round of waivers."

users = users_table.scan()['Items']

#Sort users by waiver rank
waiver_order = sorted(users, key=lambda u: u['waiver_rank'])
print("Current waiver order:")
report += "\nCurrent waiver order:"
for rank, user in enumerate(waiver_order, 1):
    print(f"{rank}. {user['team_name']}")
    report += f"\n{rank}. {user['team_name']}"

players_transferred = []
users_who_picked = []

print("Processing waivers")
#Iterate through users
for rank, user in enumerate(waiver_order, 1):
    print(f"User {rank} - {user['team_name']}")
    report += f"\nUser {rank} - {user['team_name']}"
    #If user has already picked up a player, skip them
    if user['players_picked'] > 0:
        print(f"{user['team_name']} already waivered one player this week")
        report += f"\n{user['team_name']} already waivered one player this week"
        continue
    users_squad = squads_table.scan(
        FilterExpression=Attr('xrl_team').eq(user['team_short'])
    )['Items']
    preferences = user['waiver_preferences']
    gained_player = False
    #If user didn't list any preferences, continue
    if len(preferences) == 0:
        print(f"{user['team_name']} chose not to waiver this week.")
        report += f"\n{user['team_name']} chose not to waiver this week."
        continue
    #Iterate through user's waiver preferences
    for number, player in enumerate(preferences):
        player_info = squads_table.get_item(
            Key={
                'player_id': player
            }
        )['Item']
        pickable = False
        print(f"{user['team_name']} want to sign {player_info['player_name']}.")
        report += f"\n{user['team_name']} want to sign {player_info['player_name']}."
        #If player not already picked and available to be picked
        if player not in players_transferred and ('xrl_team' not in player_info.keys() or player_info['xrl_team'] == 'None' or player_info['xrl_team'] == 'On Waivers' or player_info['xrl_team'] == 'Pre-Waivers'):
            print(f"{player_info['player_name']} is available.")
            report += f"\n{player_info['player_name']} is available."
            if len(users_squad) == 18:
                if user['provisional_drop'] == None:
                    print(f"{user['username']}'s squad already has 18 players and they haven't indicated a player to drop. Moving to next user.")
                    report += f"\n{user['username']}'s squad already has 18 players and they haven't indicated a player to drop. Moving to next user."
                    break
                else:
                    print(f"{user['username']}'s squad has 18 players. Dropping their indicated player to make room.")
                    report += f"\n{user['username']}'s squad has 18 players. Dropping their indicated player to make room."
                    players_transferred.append(user['provisional_drop'])
                    squads_table.update_item(
                        Key={
                            'player_id': user['provisional_drop']
                        },
                        UpdateExpression="set xrl_team=:t",
                        ExpressionAttributeValues={
                            ':t': 'Pre-Waivers'
                        }
                    )
                    transfers_table.put_item(
                        Item={
                            'transfer_id': user['username'] + '_' + str(datetime.now()),
                            'user': user['username'],                        
                            'datetime': datetime.now().strftime("%c"),
                            'type': 'Drop',
                            'round_number': round_number,
                            'player_id': user['provisional_drop']
                        }
                    )
                    users_table.update_item(
                        Key={
                            'username': user['username']
                        },
                        UpdateExpression="set provisional_drop=:pd",
                        ExpressionAttributeValues={
                            ':pd': None
                        }
                    )
                    pickable = True
            else:
                pickable = True
        else:
            print(f"{player_info['player_name']} is not available.")
            report += f"\n{player_info['player_name']} is not available."
        if pickable:
            squads_table.update_item(
                Key={
                    'player_id': player
                },
                UpdateExpression="set xrl_team=:t",
                ExpressionAttributeValues={
                    ':t': user['team_short']
                }
            )
            transfers_table.put_item(
                    Item={
                        'transfer_id': user['username'] + '_' + str(datetime.now()),
                        'user': user['username'],                        
                        'datetime': datetime.now().strftime("%c"),
                        'type': 'Waiver',
                        'round_number': round_number,
                        'player_id': player
                    }
                )
            message = {
                "sender": "XRL Admin",
                "datetime": datetime.now().strftime("%c"),
                "subject": "New Player",
                "message": f"Congratulations! You picked up {player_info['player_name']} in this week's waivers."
            }
            user['inbox'].append(message)
            gained_player = True
            players_transferred.append(player)
            print(f"{user['username']} signed {player_info['player_name']}")
            report += f"\n{user['username']} signed {player_info['player_name']}"
            break
    if gained_player:
        players_picked = 1
        users_who_picked.append(user)
    else:
        players_picked = 0
        print(f"{user['username']} didn't get any of their preferences")
        report += f"\n{user['username']} didn't get any of their preferences"
    users_table.update_item(
                Key={
                    'username': user['username']
                },
                UpdateExpression="set waiver_preferences=:wp, players_picked=players_picked+:v, inbox=:i",
                ExpressionAttributeValues={
                    ':wp': [],
                    ':v': players_picked,
                    ':i': user['inbox']
                }
            )
waiver_order = [u for u in waiver_order if u not in users_who_picked] + users_who_picked[::-1]

print("New waiver order:")
report += "\nNew waiver order:"
for rank, user in enumerate(waiver_order, 1):
    print(f"{rank}. {user['username']}")
    report += f"\n{rank}. {user['username']}"
    users_table.update_item(
                Key={
                    'username': user['username']
                },
                UpdateExpression="set waiver_rank=:wr",
                ExpressionAttributeValues={
                    ':wr': rank
                }
            )

waivers_table.put_item(
    Item={
        'waiver_round': str(round_number) + '_B',
        'report': report
    }
)


    
