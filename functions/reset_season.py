import boto3
from boto3.dynamodb.conditions import Key, Attr

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
                player['position']: {}
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