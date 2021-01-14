import boto3
from boto3.dynamodb.conditions import Key, Attr

dynamodb = boto3.resource('dynamodb', 'ap-southeast-2')

#Reset users table with zeroed stats and captain counts, and 3 powerplays
users_table = dynamodb.Table('users2020')
resp = users_table.scan()
users = resp['Items']
clean_stats = {
    'wins': 0,
    'draws': 0,
    'losses': 0,
    'for': 0,
    'against': 0,
    'points': 0
}
for user in users:
    users_table.update_item(
        Key={
            'username': user['username']
        },
        UpdateExpression="set powerplays=:p, stats=:s, captain_counts=:cc, waiver_rank=:wr, waiver_preferences=:wp, inbox=:i, players_picked=:pp, provisional_drop=:pd",
        ExpressionAttributeValues={
            ':p': 3,
            ':s': clean_stats,
            ':cc': {},
            ':wr': 0,
            ':wp': [],
            ':i': [],
            ':pp': 0,
            ':pd': None
        }
    )

#Reset rounds table with zeroed match scores and stati reset with only round 1 active
rounds_table = dynamodb.Table('rounds2020')
all_rounds = rounds_table.scan()['Items']
for r in all_rounds:
    fixtures = r['fixtures']
    for match in fixtures:
        match['home_score'] = 0
        match['away_score'] = 0
    if r['round_number'] == 1:
        rounds_table.update_item(
            Key={
                'round_number': r['round_number']
            },
            UpdateExpression="set active=:a, in_progress=:ip, completed=:c, fixtures=:f, scooping=:s",
            ExpressionAttributeValues={
                ':a': True,
                ':ip': False,
                ':c': False,
                ':f': fixtures,
                ':s': True
            }
        )
    else:
        rounds_table.update_item(
            Key={
                'round_number': r['round_number']
            },
            UpdateExpression="set active=:a, in_progress=:ip, completed=:c, fixtures=:f, scooping=:s",
            ExpressionAttributeValues={
                ':a': False,
                ':ip': False,
                ':c': False,
                ':f': fixtures,
                ':s': False
            }
        )

#Reset lineup table with played columns as false and score as 0
lineups_table = dynamodb.Table('lineups2020')
resp = lineups_table.scan()
lineups = resp['Items']
with lineups_table.batch_writer() as batch:
    for player in lineups:
        lineups_table.delete_item(
            Key={
                'name+nrl+xrl+round': player['name+nrl+xrl+round']
            }
        )

#Reset any accumulated 2nd position appearances and awarded second position
players_table = dynamodb.Table('players2020')
players = players_table.scan(
    FilterExpression=Attr('new_position_appearances').exists()
)['Items']
for player in players:
    players_table.update_item(
        Key={
            'player_id': player['player_id']
        },
        UpdateExpression="SET position2=:p2, new_position_appearances=:npa",
        ExpressionAttributeValues={
            ':p2': '',
            ':npa': {}
        }
    )

transfers_table = dynamodb.Table('transfers2020')
transfers = transfers_table.scan()['Items']
with transfers_table.batch_writer() as batch:
    for transfer in transfers:
        batch.delete_item(
            Key={
                'transfer_id': transfer['transfer_id']
            }
        )