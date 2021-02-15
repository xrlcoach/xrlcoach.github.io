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
lineups_table = dynamodbResource.Table('lineups2020')

#Find current active round
resp = rounds_table.scan(
    FilterExpression=Attr('active').eq(True)
)
round_number = max([r['round_number'] for r in resp['Items']])
print(f"Current XRL round: {round_number}. First round of waivers.")
report += f"\nCurrent XRL round: {round_number}. First round of waivers."

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
        #Check if player not already picked and available to be picked
        if player not in players_transferred and ('xrl_team' not in player_info.keys() or player_info['xrl_team'] == 'None' or player_info['xrl_team'] == 'On Waivers' or player_info['xrl_team'] == 'Pre-Waivers'):
            print(f"{player_info['player_name']} is available.")
            report += f"\n{player_info['player_name']} is available."
            #Check if user already has 18 players in squad
            if len(users_squad) == 18:
                #If they do, and haven't indicated a player to drop, continue to next user
                if user['provisional_drop'] == None:
                    print(f"{user['username']}'s squad already has 18 players and they haven't indicated a player to drop. Moving to next user.")
                    report += f"\n{user['username']}'s squad already has 18 players and they haven't indicated a player to drop. Moving to next user."
                    break
                #If they do, and they HAVE indicated a player to drop...
                else:
                    print(f"{user['username']}'s squad has 18 players. Dropping their indicated player to make room.")
                    report += f"\n{user['username']}'s squad has 18 players. Dropping their indicated player to make room."
                    #Add their provisional drop player to the array of players transferred
                    players_transferred.append(user['provisional_drop'])
                    #Get player entry from db
                    player_to_drop = squads_table.get_item(
                        Key={
                            'player_id': user['provisional_drop']
                        }
                    )['Item']
                    #Remove player from user's next lineup
                    lineups_table.delete_item(
                        Key={
                            'name+nrl+xrl+round': player_to_drop['player_name'] + ';' + player_to_drop['nrl_club'] + ';' + user['team_short'] + ';' + str(round_number)
                        }
                    )
                    #Update player's XRL team from the user to Pre-Waivers (This means they will remain
                    #on waiver for one whole round)
                    squads_table.update_item(
                        Key={
                            'player_id': user['provisional_drop']
                        },
                        UpdateExpression="set xrl_team=:t",
                        ExpressionAttributeValues={
                            ':t': 'Pre-Waivers'
                        }
                    )
                    #Add record of drop to transfers table
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
                    #Clear user's provisional drop
                    users_table.update_item(
                        Key={
                            'username': user['username']
                        },
                        UpdateExpression="set provisional_drop=:pd",
                        ExpressionAttributeValues={
                            ':pd': None
                        }
                    )
                    #Set boolean saying user may sign new player
                    pickable = True
            else:
                #If player is available AND user's squad has less than 18 players,
                #then set boolean saying new player is pickable
                pickable = True
        else:
            #If player has already been transferred in this session, or their XRL team is not 'None',
            #'Pre-Waivers' or 'On Waivers', then they are not available to pick
            print(f"{player_info['player_name']} is not available.")
            report += f"\n{player_info['player_name']} is not available."

        if pickable:
            #If player can be signed, update their XRL team to the user's team acronym
            squads_table.update_item(
                Key={
                    'player_id': player
                },
                UpdateExpression="set xrl_team=:t",
                ExpressionAttributeValues={
                    ':t': user['team_short']
                }
            )
            #Add a record of the transfer to the db
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
            #Add a message to the user's inbox
            message = {
                "sender": "XRL Admin",
                "datetime": datetime.now().strftime("%c"),
                "subject": "New Player",
                "message": f"Congratulations! You picked up {player_info['player_name']} in this week's waivers."
            }
            user['inbox'].append(message)
            #Indicate that the user has signed a player
            gained_player = True
            #Add player to list of players transferred
            players_transferred.append(player)
            print(f"{user['username']} signed {player_info['player_name']}")
            report += f"\n{user['username']} signed {player_info['player_name']}"
            break
    
    #Indicate whether the curent user has picked a player or not
    if gained_player:
        players_picked = 1
        users_who_picked.append(user)
    else:
        players_picked = 0
        print(f"{user['username']} didn't get any of their preferences")
        report += f"\n{user['username']} didn't get any of their preferences"
    #Clear the user's waiver preferences, update their players_picked attribute and inbox
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
#Recalculate waiver order (players who didn't pick followed by those who did in reverse order)
waiver_order = [u for u in waiver_order if u not in users_who_picked] + users_who_picked[::-1]

#Save new waiver order to db 
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

#Add waiver report to db
waivers_table.put_item(
    Item={
        'waiver_round': str(round_number) + '_A',
        'report': report
    }
)


    
