import boto3
from boto3.dynamodb.conditions import Key, Attr
import sys
from datetime import datetime

log = open('logs/start_round.log', 'a')
sys.stdout = log
print(f"Script executing at {datetime.now()}")

dynamodb = boto3.resource('dynamodb', 'ap-southeast-2')
rounds_table = dynamodb.Table('rounds2020')
lineups_table = dynamodb.Table('lineups2020')
users_table = dynamodb.Table('users2020')
players_table = dynamodb.Table('players2020')

#Get all rounds that aren't in progress
resp = rounds_table.scan(
    FilterExpression=Attr('in_progress').eq(False)
)
#Find the next round (lowest round number of those not in progress)
round_number = min([r['round_number'] for r in resp['Items']])
print(f"Active Round: {round_number}. Setting to 'in progress' and closing player scooping")

#Update db and set round as in_progress, and close scooping
rounds_table.update_item(
    Key={
        'round_number': round_number
    },
    UpdateExpression="set in_progress=:t, scooping=:s",
    ExpressionAttributeValues={
        ':t': True,
        ':s': False
    }
)
print(f"Round {round_number} now in progress.")


print(f"Checking lineups...")
#Get users and current round's lineups
resp = users_table.scan()
users = resp["Items"]
resp = lineups_table.scan(
    FilterExpression=Attr('round_number').eq(str(round_number))
)
lineups = resp["Items"]

#Iterate through users and check lineups, captains and powerplays
for user in users:
    #Filter user's lineup from round
    lineup = [player for player in lineups if player['xrl_team'] == user['team_short']]
    #If they user hasn't set a lineup, get their previous lineup and set it for this round
    if len(lineup) == 0:
        print(f"{user['team_name']} didn't set a lineup this week. Reverting to last week's lineup.")
        #Find last round's lineup in db
        lineup = lineups_table.scan(
            FilterExpression=Attr('round_number').eq(str(round_number - 1)) & Attr('xrl_team').eq(user['team_short'])
        )["Items"]
        #Go through each player and create a new entry for this round's lineup
        for player in lineup:
            #If the user powerplayed last round, set the second captain to be vice-captain
            if player['captain2']:
                player['captain2'] = False
                player['vice'] = True
            #Add entry to lineups table
            lineups_table.put_item(
                Item={
                    'name+nrl+xrl+round': player['player_name'] + ';' + player['nrl_club'] + ';' + user['team_short'] + ';' + str(round_number),
                    'player_id': player['player_id'],
                    'player_name': player['player_name'],
                    'nrl_club': player['nrl_club'],
                    'xrl_team': user['team_short'],
                    'round_number': str(round_number),
                    'position_specific': player['position_specific'],
                    'position_general': player['position_general'],
                    'second_position': player['second_position'],
                    'position_number': player['position_number'],
                    'captain': player['captain'],
                    'captain2': player['captain2'],
                    'vice': player['vice'],
                    'kicker': player['kicker'],
                    'backup_kicker': player['backup_kicker'],
                    'played_nrl': False,
                    'played_xrl': False,
                    'score': 0
                }
            )
        print("Lineup set.")

    #Find the captain(s) in the lineup
    captains = [player for player in lineup if player['captain'] or player['captain2']]
    #Check if user has used a powerplay
    powerplay = len(captains) > 1

    #For each captain, update their captain counts
    for captain in captains:
        print(f"{user['team_name']} captained {captain['player_name']}")
        #Get player entry from db
        player_entry = players_table.get_item(Key={'player_id': captain['player_id']})['Item']
        #If db entry doesn't have record of times as captain, intitialise count as 0
        if 'times_as_captain' not in player_entry.keys():
            player_entry.times_as_captain = 0        
        #If player has already been captain 6 times, remove them as captain 
        if player_entry.times_as_captain == 6:
            print(f"ERROR - {captain['player_name']} has already been captain six times. Removing as captain.")
            lineups_table.update_item(
                Key={
                    'name+nrl+xrl+round': captain['name+nrl+xrl+round']
                },
                UpdateExpression="set captain=:c, captain2=:c2",
                ExpressionAttributeValues={
                    ':c': False,
                    ':c2': False
                }
            )
        #Else increment times as captain by 1
        else:
            player_entry.times_as_captain += 1
            players_table.update_item(
                Key={'player_id': player_entry['player_id']},
                UpdateExpression="set times_as_captain=:i",
                ExpressionAttributeValues={':i': player_entry.times_as_captain}
            )
            
    #Find vice-captain in lineup
    vice = [player for player in lineup if player['vice']]
    #Check if vice captain exists
    if len(vice) > 0:
        vice = vice[0]
        #Get player entry from db
        player_entry = players_table.get_item(Key={'player_id': vice['player_id']})['Item']
        #Check if vice-captain has been captain 6 times
        if 'times_as_captain' in player_entry.keys() and player_entry.times_as_captain == 6:
            print(f"ERROR - {vice['player_name']} has already been captain six times. Removing as vice-captain.")
            #If they have, remove them as vice captain in lineup
            lineups_table.update_item(
                Key={
                    'name+nrl+xrl+round': vice['name+nrl+xrl+round']
                },
                UpdateExpression="set vice=:v",
                ExpressionAttributeValues={
                    ':v': False
                }
            )

    #If the user has used a powerplay, decrement available powerplays in db
    if powerplay:
        print(f"{user['team_name']} used a powerplay. Updating database")
        users_table.update_item(
                Key={
                    'username': user['username']
                },
                UpdateExpression="set powerplays = powerplays - :v",
                ExpressionAttributeValues={                    
                    ':v': 1
                }
            )

#Calculate the new waiver order based on number of players picked during scooping period
print("Calculating new waiver order")
#Get original waiver order
waiver_order = sorted(users, key=lambda u: u['waiver_rank'])
#Sort by number of players picked
new_waiver_order = sorted(waiver_order, key=lambda u: u['players_picked'])
#Update new order to db
print("New order: ")
for rank, user in enumerate(new_waiver_order, 1):
    print(f"{rank}: {user['username']}")
    users_table.update_item(
                Key={
                    'username': user['username']
                },
                UpdateExpression="set waiver_rank=:wr, players_picked=:pp",
                ExpressionAttributeValues={
                    ':wr': rank,
                    ':pp': 0
                }
            )
print("Process complete")
    
