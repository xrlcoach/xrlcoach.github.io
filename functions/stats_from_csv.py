import csv
from sys import argv

with open(f'../stats/2020/{argv[1]}.csv') as statfile:
    reader = csv.DictReader(statfile)
    count = 0
    for row in reader:
        count += 1
        if count == 1:
            print(row)
            print(row['Player'])
            break