import boto3
from boto3.dynamodb.conditions import Key, Attr
import random

dynamodb = boto3.resource('dynamodb', 'ap-southeast-2')


table = dynamodb.Table('XRL2020')

resp = table.query(
    IndexName='sk-data-index',
    KeyConditionExpression=Key('sk').eq('DETAILS') & Key('data').begins_with('NAME#')
)
users = resp['Items']
clean_stats = {
    'wins': 0,
    'draws': 0,
    'losses': 0,
    'for': 0,
    'against': 0,
    'points': 0
}

print("Resetting user details and deleting trade offer records")
for rank, user in enumerate(users, 1):
    table.update_item(
        Key={
            'pk': user['pk'],
            'sk': 'DETAILS'
        },
        UpdateExpression="set powerplays=:p, stats=:s, waiver_rank=:wr, waiver_preferences=:wp, inbox=:i, players_picked=:pp, provisional_drop=:pd",
        ExpressionAttributeValues={
            ':p': 3,
            ':s': clean_stats,
            ':wr': rank,
            ':wp': [],
            ':i': [],
            ':pp': 0,
            ':pd': None
        }
    )
    offers = table.query(
        KeyConditionExpression=Key('pk').eq(user['pk']) & Key('sk').begins_with('OFFER#')
    )['Items']
    for o in offers:
        table.delete_item(
            Key={
                'pk': o['pk'],
                'sk': o['sk']
            }
        )

#Reset rounds table with zeroed match scores and stati reset with only round 1 active


print("Resetting round status and clearing fixtures")
for r in range(1, 22):
    #Reset round status
    if r == 1:
        table.update_item(
            Key={
                'pk': 'ROUND#' + str(r),
                'sk': 'STATUS'
            },
            UpdateExpression="set #D=:d, active=:a, in_progress=:ip, completed=:c, scooping=:s",
            ExpressionAttributeNames={
                '#D': 'data'
            },
            ExpressionAttributeValues={
                ':d': 'ACTIVE#true',
                ':a': True,
                ':ip': False,
                ':c': False,
                ':s': True
            }
        )
    else:
        table.update_item(
            Key={
                'pk': 'ROUND#' + str(r),
                'sk': 'STATUS'
            },
            UpdateExpression="set #D=:d, active=:a, in_progress=:ip, completed=:c, scooping=:s",
            ExpressionAttributeNames={
                '#D': 'data'
            },
            ExpressionAttributeValues={
                ':d': 'ACTIVE#false',
                ':a': False,
                ':ip': False,
                ':c': False,
                ':s': False
            }
        )

    #Delete fixtures

    fixtures = table.query(
        KeyConditionExpression=Key('pk').eq('ROUND#' + str(r)) & Key('sk').begins_with('FIXTURE')
    )['Items']
    for match in fixtures:
        table.delete_item(
            Key={
                'pk': match['pk'],
                'sk': match['sk']
            }
        )
    

#Get all players

print("Retrieving all player profiles")
players = table.query(
    IndexName='sk-data-index',
    KeyConditionExpression=Key('sk').eq('PROFILE') & Key('data').begins_with('TEAM#')
)['Items']

print('Deleting lineup and stat records and resetting profiles')
for player in players:
    #Delete any lineup entries
    entries = table.query(
        KeyConditionExpression=Key('pk').eq(player['pk']) & Key('sk').begins_with('LINEUP#')
    )['Items']
    for entry in entries:
        table.delete_item(
            Key={
                'pk': entry['pk'],
                'sk': entry['sk']
            }
        )

    #Delete any stat entries
    entries = table.query(
        KeyConditionExpression=Key('pk').eq(player['pk']) & Key('sk').begins_with('STATS#')
    )['Items']
    for entry in entries:
        table.delete_item(
            Key={
                'pk': entry['pk'],
                'sk': entry['sk']
            }
        )

    #Reset any captaincy counts, second position appearances, XRL team and stats
    table.update_item(
        Key={
            'pk': player['pk'],
            'sk': 'PROFILE'
        },
        UpdateExpression="SET times_as_captain=:tac, position2=:p2, new_position_appearances=:npa, #D=:d, xrl_team=:xrl, stats=:s, scoring_stats=:ss",
        ExpressionAttributeNames={
            '#D': 'data'
        },
        ExpressionAttributeValues={
            ':tac': 0,
            ':p2': None,
            ':npa': {},
            ':d': 'TEAM#None',
            ':xrl': 'None',
            ':s': {},
            ':ss': {
                player['position']: {},
                'kicker': {}
            }
        }
    )

print("Deleting transfer records")
transfers = table.query(
    IndexName='sk-data-index',
    KeyConditionExpression=Key('sk').eq('TRANSFER') & Key('data').begins_with('ROUND#')
)['Items']
for transfer in transfers:
    table.delete_item(
        Key={
            'pk': transfer['pk'],
            'sk': transfer['sk']
        }
    )

print("Deleting trade offers")
trades = table.query(
    IndexName='sk-data-index',
    KeyConditionExpression=Key('sk').eq('OFFER') & Key('data').begins_with('TO#')
)['Items']
for trade in trades:
    table.delete_item(
        Key={
            'pk': trade['pk'],
            'sk': trade['sk']
        }
    )

print("Deleting waiver reports")
reports = table.query(
    KeyConditionExpression=Key('pk').eq('WAIVER') & Key('sk').begins_with('REPORT#')
)['Items']

for r in reports:
    table.delete_item(
        Key={
            'pk': r['pk'],
            'sk': r['sk']
        }
    )

backs = [p for p in players if p['position'] == 'Back']
forwards = [p for p in players if p['position'] == 'Forward']
playmakers = [p for p in players if p['position'] == 'Playmaker']

#Randomly assign players to team
print("Randomly assigning players to XRL teams")
for user in users:
    for i in range(7):
        random_player = backs.pop(random.randint(0, len(backs) - 1))
        table.update_item(
            Key={
                'pk': random_player['pk'],
                'sk': 'PROFILE'
            },
            UpdateExpression="set #D=:d, xrl_team=:xrl",
            ExpressionAttributeNames={
                '#D': 'data'
            },
            ExpressionAttributeValues={
                ':d': 'TEAM#' + user['team_short'],
                ':xrl': user['team_short']
            }
        )
    for i in range(7):
        random_player = forwards.pop(random.randint(0, len(forwards) - 1))
        table.update_item(
            Key={
                'pk': random_player['pk'],
                'sk': 'PROFILE'
            },
            UpdateExpression="set #D=:d, xrl_team=:xrl",
            ExpressionAttributeNames={
                '#D': 'data'
            },
            ExpressionAttributeValues={
                ':d': 'TEAM#' + user['team_short'],
                ':xrl': user['team_short']
            }
        )

    for i in range(4):
        random_player = playmakers.pop(random.randint(0, len(playmakers) - 1))
        table.update_item(
            Key={
                'pk': random_player['pk'],
                'sk': 'PROFILE'
            },
            UpdateExpression="set #D=:d, xrl_team=:xrl",
            ExpressionAttributeNames={
                '#D': 'data'
            },
            ExpressionAttributeValues={
                ':d': 'TEAM#' + user['team_short'],
                ':xrl': user['team_short']
            }
        )

#Set random lineup for each user


positions_backs = ['fullback', 'winger1', 'centre1', 'centre2', 'winger2']
positions_playmakers = ['five_eighth', 'halfback', 'hooker']
playmaker_numbers = [6, 7, 9]
positions_forwards = ['prop1', 'prop2', 'row1', 'row2', 'lock']
forward_numbers = [8, 10, 11, 12, 13]
interchange = ['int1', 'int2', 'int3', 'int4']
int_numbers = [14, 15, 16, 17]
roles = ['captain', 'captain2', 'vice', 'kicker', 'backup_kicker']

print("Setting a lineup for each user")
for user in users:
    squad = table.query(
        IndexName='sk-data-index',
        KeyConditionExpression=Key('sk').eq('PROFILE') & Key('data').eq('TEAM#' + user['team_short'])
    )['Items']
    squad_numbers = list(range(1, 14))
    captain = squad_numbers.pop(random.randint(0, len(squad_numbers) - 1))
    vice = squad_numbers.pop(random.randint(0, len(squad_numbers) - 1))
    kicker = squad_numbers.pop(random.randint(0, len(squad_numbers) - 1))
    backup = squad_numbers.pop(random.randint(0, len(squad_numbers) - 1))
    backs = [p for p in squad if p['position'] == 'Back']
    forwards = [p for p in squad if p['position'] == 'Forward']
    playmakers = [p for p in squad if p['position'] == 'Playmaker']
    for number, pos in enumerate(positions_backs, 1):
        p = backs.pop()
        squad.remove(p)        
        entry = {
            'pk': p['pk'],
            'sk': 'LINEUP#1',
            'data': 'TEAM#' + user['team_short'],
            'player_id': p['player_id'],
            'player_name': p['player_name'],
            'nrl_club': p['nrl_club'],
            'xrl_team': user['team_short'],
            'round_number': '1',
            'position_specific': pos,
            'position_general': 'Back',
            'second_position': None,
            'position_number': number,
            'captain': captain == number,
            'captain2': False,
            'vice': vice == number,
            'kicker': kicker == number,
            'backup_kicker': backup == number,
            'played_nrl': False,
            'played_xrl': False,
            'score': 0
        }
        table.put_item(
                Item=entry
            )
    for i, pos in enumerate(positions_playmakers):
        p = playmakers.pop()      
        squad.remove(p)          
        entry = {
            'pk': p['pk'],
            'sk': 'LINEUP#1',
            'data': 'TEAM#' + user['team_short'],
            'player_id': p['player_id'],
            'player_name': p['player_name'],
            'nrl_club': p['nrl_club'],
            'xrl_team': user['team_short'],
            'round_number': '1',
            'position_specific': pos,
            'position_general': 'Playmaker',
            'second_position': None,
            'position_number': playmaker_numbers[i],
            'captain': captain == playmaker_numbers[i],
            'captain2': False,
            'vice': vice == playmaker_numbers[i],
            'kicker': kicker == playmaker_numbers[i],
            'backup_kicker': backup == playmaker_numbers[i],
            'played_nrl': False,
            'played_xrl': False,
            'score': 0
        }
        table.put_item(
                Item=entry
            )
    for i, pos in enumerate(positions_forwards):
        p = forwards.pop() 
        squad.remove(p)               
        entry = {
            'pk': p['pk'],
            'sk': 'LINEUP#1',
            'data': 'TEAM#' + user['team_short'],
            'player_id': p['player_id'],
            'player_name': p['player_name'],
            'nrl_club': p['nrl_club'],
            'xrl_team': user['team_short'],
            'round_number': '1',
            'position_specific': pos,
            'position_general': 'Forward',
            'second_position': None,
            'position_number': forward_numbers[i],
            'captain': captain == forward_numbers[i],
            'captain2': False,
            'vice': vice == forward_numbers[i],
            'kicker': kicker == forward_numbers[i],
            'backup_kicker': backup == forward_numbers[i],
            'played_nrl': False,
            'played_xrl': False,
            'score': 0
        }
        table.put_item(
                Item=entry
            )
    for i, pos in enumerate(interchange):
        p = squad.pop() 
        entry = {
            'pk': p['pk'],
            'sk': 'LINEUP#1',
            'data': 'TEAM#' + user['team_short'],
            'player_id': p['player_id'],
            'player_name': p['player_name'],
            'nrl_club': p['nrl_club'],
            'xrl_team': user['team_short'],
            'round_number': '1',
            'position_specific': pos,
            'position_general': p['position'],
            'second_position': None,
            'position_number': int_numbers[i],
            'captain': False,
            'captain2': False,
            'vice': False,
            'kicker': False,
            'backup_kicker': False,
            'played_nrl': False,
            'played_xrl': False,
            'score': 0
        }
        table.put_item(
                Item=entry
            )
