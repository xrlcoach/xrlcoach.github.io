import boto3
from boto3.dynamodb.conditions import Key, Attr
import sys
from datetime import datetime

def lambda_handler(event, context):

    print(f"Script executing at {datetime.now()}")

    dynamodb = boto3.resource('dynamodb', 'ap-southeast-2')
    table = dynamodb.Table('XRL2021')

    #Get all active rounds
    resp = table.query(
        IndexName='sk-data-index',
        KeyConditionExpression=Key('sk').eq('STATUS') & Key('data').eq('ACTIVE#true')
    )
    #Find the next round (highest active round)
    round_number = max([r['round_number'] for r in resp['Items']])
    print(f"Active Round: {round_number}. Setting to 'in progress' and closing player scooping")

    #Update db and set round as in_progress, and close scooping
    table.update_item(
        Key={
            'pk': 'ROUND#' + str(round_number),
            'sk': 'STATUS'
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
    users = table.query(
        IndexName='sk-data-index',
        KeyConditionExpression=Key('sk').eq('DETAILS') & Key('data').begins_with('NAME#')
    )['Items']
    lineups = table.query(
        IndexName='sk-data-index',
        KeyConditionExpression=Key('sk').eq('LINEUP#' + str(round_number)) & Key('data').begins_with('TEAM#')
    )['Items']

    #Iterate through users and check lineups, captains and powerplays
    for user in users:
        #Filter user's lineup from round
        lineup = [player for player in lineups if player['xrl_team'] == user['team_short']]
        #If they user hasn't set a lineup, get their previous lineup and set it for this round
        if len(lineup) == 0:
            print(f"{user['team_name']} didn't set a lineup this week. Reverting to last week's lineup.")
            #Find last round's lineup in db
            old_lineup = table.query(
                IndexName='sk-data-index',
                KeyConditionExpression=Key('sk').eq('LINEUP#' + str(round_number - 1)) & Key('data').eq('TEAM#' + user['team_short'])
            )['Items']
            #Go through each player and create a new entry for this round's lineup
            for player in old_lineup:
                #Check that player is still in the side
                profile = table.get_item(Key={
                    'pk': player['pk'],
                    'sk': 'PROFILE'
                })['Item']
                if profile['xrl_team'] != user['team_short']:
                    print(f"{profile['player_name']} is no longer at {user['team_name']}.")
                    continue
                #If the user powerplayed last round, set the second captain to be vice-captain
                if player['captain2']:
                    player['captain2'] = False
                    player['vice'] = True
                #Add entry to lineups table
                entry = {
                        'pk': player['pk'],
                        'sk': 'LINEUP#' + str(round_number),
                        'data': 'TEAM#' + user['team_short'],
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
                        'captain2': False,
                        'vice': player['vice'],
                        'kicker': player['kicker'],
                        'backup_kicker': player['backup_kicker'],
                        'played_nrl': False,
                        'played_xrl': False,
                        'score': 0
                    }
                lineup.append(entry)
                table.put_item(
                    Item=entry
                )
            print("Lineup set.")

        #Find the captain(s) in the lineup
        captains = [player for player in lineup if player['captain'] or player['captain2']]
        #Check if user has used a powerplay
        powerplay = len(captains) > 1
        #Check if they have a powerplay to use
        if powerplay and user['powerplays'] < 1:
            print(f"{user['team_name']} fielded two captains but has no powerplays left. Changing their second captain to vice-captain.")
            captain2 = [p for p in captains if p['captain2']][0]
            captains = [p for p in captains if not p['captain2']]
            #If they can't powerplay, change second captain to vice in lineup...
            for i, player in enumerate(lineup):
                if player['player_id'] == captain2['player_id']:
                    player['captain2'] = False
                    player['vice'] = True
                    lineup[i] = player
            #...and in database
            table.update_item(
                Key={
                    'pk': captain2['pk'],
                    'sk': captain2['sk']
                },
                UpdateExpression="set captain=:c, captain2=:c2, vice=:v",
                ExpressionAttributeValues={
                    ':c': False,
                    ':c2': False,
                    ':v': True
                }
            )
            #And turn off powerplay
            powerplay = False

        #Bool to see if vice-captain needs to be made captain
        sub_vice_captain = False

        #For each captain, update their captain counts
        for captain in captains:
            print(f"{user['team_name']} captained {captain['player_name']}")
            #Get player entry from db
            player_entry = table.get_item(Key={
                'pk': captain['pk'],
                'sk': 'PROFILE',
            })['Item']
            #If db entry doesn't have record of times as captain, intitialise count as 0
            if 'times_as_captain' not in player_entry.keys():
                player_entry['times_as_captain'] = 0        
            #If player has already been captain 6 times, remove them as captain 
            if player_entry['times_as_captain'] == 6:
                print(f"ERROR - {captain['player_name']} has already been captain six times. Removing as captain.")
                table.update_item(
                    Key={
                        'pk': captain['pk'],
                        'sk': captain['sk']
                    },
                    UpdateExpression="set captain=:c, captain2=:c2",
                    ExpressionAttributeValues={
                        ':c': False,
                        ':c2': False
                    }
                )
                sub_vice_captain = True
                
            #Else increment times as captain by 1
            else:
                player_entry['times_as_captain'] += 1
                table.update_item(
                    Key={
                        'pk': player_entry['pk'],
                        'sk': 'PROFILE',
                    },
                    UpdateExpression="set times_as_captain=:i",
                    ExpressionAttributeValues={':i': player_entry['times_as_captain']}
                )
                
        #Find vice-captain in lineup
        vice = [player for player in lineup if player['vice']]
        #Check if vice captain exists
        if len(vice) > 0:
            vice = vice[0]
            #Get player entry from db
            player_entry = table.get_item(Key={
                'pk': vice['pk'],
                'sk': 'PROFILE',
            })['Item']
            #Check if vice-captain has been captain 6 times
            if 'times_as_captain' in player_entry.keys() and player_entry['times_as_captain'] == 6:
                print(f"ERROR - {vice['player_name']} has already been captain six times. Removing as vice-captain.")
                #If they have, remove them as vice captain in lineup
                table.update_item(
                    Key={
                        'pk': vice['pk'],
                        'sk': vice['sk']
                    },
                    UpdateExpression="set vice=:v",
                    ExpressionAttributeValues={
                        ':v': False
                    }
                )
            #If main captain has already been captain 6 times, and the vice hasn't, sub in vice as captain 
            elif sub_vice_captain:
                print(f"{vice['player_name']} takes over as captain.")
                table.update_item(
                    Key={
                        'pk': vice['pk'],
                        'sk': vice['sk']
                    },
                    UpdateExpression="set vice=:v, captain=:c",
                    ExpressionAttributeValues={
                        ':v': False,
                        ':c': True
                    }
                )

        #If the user has used a powerplay, decrement available powerplays in db
        if powerplay:
            print(f"{user['team_name']} used a powerplay. Updating database")
            table.update_item(
                Key={
                    'pk': user['pk'],
                    'sk': 'DETAILS'
                },
                UpdateExpression="set powerplays = powerplays - :v",
                ExpressionAttributeValues={                    
                    ':v': 1
                }
            )

    if round_number > 1:
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
            table.update_item(
                        Key={
                            'pk': user['pk'],
                            'sk': 'DETAILS'
                        },
                        UpdateExpression="set waiver_rank=:wr, players_picked=:pp",
                        ExpressionAttributeValues={
                            ':wr': rank,
                            ':pp': 0
                        }
                    )
    print("Process complete")
        
