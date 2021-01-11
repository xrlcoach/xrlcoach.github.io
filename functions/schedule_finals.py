import boto3

dynamodb = boto3.resource('dynamodb', 'ap-southeast-2')

users_table = dynamodb.Table('users2020')
users = users_table.scan()['Items']

ladder = sorted(users, key=lambda u: (-u['stats']['points'], -(u['stats']['for'] - u['stats']['against']), -u['stats']['for']))

rounds_table = dynamodb.Table('rounds2020')
