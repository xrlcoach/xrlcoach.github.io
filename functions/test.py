users = [
    {
        "username": "U1",
        "waiver_rank": 4,
        "players_picked": 1
    },
    {
        "username": "U2",
        "waiver_rank": 2,
        "players_picked": 0
    },
    {
        "username": "U3",
        "waiver_rank": 1,
        "players_picked": 1
    },
    {
        "username": "U4",
        "waiver_rank": 3,
        "players_picked": 0
    },
]
waiver_order = sorted(users, key=lambda u: u['waiver_rank'])
users_who_picked = []
print("Old order: ")
for rank, user in enumerate(waiver_order):
    print(f"{rank}: {user['username']}")
    if user['players_picked'] > 0:
        waiver_order.pop(rank)
        users_who_picked.append(user)
print("Calculating new waiver order")
print("Users who picked:")
print(str(users_who_picked))
print("Users who didn't:")
print(str(waiver_order))
users_who_picked.reverse()
new_waiver_order = waiver_order + users_who_picked
print("New order: ")
for rank, user in enumerate(new_waiver_order, 1):
    print(f"{rank}: {user['username']}")
print("Process complete")
print("U2 picks 3 players")
u2 = [u for u in new_waiver_order if u['username'] == "U2"][0]
u2index = new_waiver_order.index(u2)
new_waiver_order.pop(u2index)
u2['players_picked'] += 3
new_waiver_order.append(u2)
print("New order: ")
for rank, user in enumerate(new_waiver_order, 1):
    print(f"{rank}: {user['username']}")
print("U1 picks player")
u1 = [u for u in new_waiver_order if u['username'] == "U1"][0]
u1index = new_waiver_order.index(u1)
new_waiver_order.pop(u1index)
u1['players_picked'] += 1
new_waiver_order.append(u1)
print("New order: ")
for rank, user in enumerate(new_waiver_order, 1):
    print(f"{rank}: {user['username']}")
print("U4 picks 3 players")
u4 = [u for u in new_waiver_order if u['username'] == "U4"][0]
u4index = new_waiver_order.index(u4)
new_waiver_order.pop(u4index)
u4['players_picked'] += 3
new_waiver_order.append(u4)
print("New order: ")
for rank, user in enumerate(new_waiver_order, 1):
    print(f"{rank}: {user['username']}")

new_waiver_order = sorted(new_waiver_order, key=lambda u: u['players_picked'])
print(new_waiver_order)
print("Final order: ")
for rank, user in enumerate(new_waiver_order, 1):
    print(f"{rank}: {user['username']}")