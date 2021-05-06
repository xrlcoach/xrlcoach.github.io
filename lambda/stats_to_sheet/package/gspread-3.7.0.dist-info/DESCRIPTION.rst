Super simple `Google Spreadsheets Python API`_.

.. _Google Spreadsheets Python API: https://github.com/burnash/gspread

Features
--------

* Google Sheets API v4.
* Open a spreadsheet by title, key or url.
* Read, write, and format cell ranges.
* Sharing and access control.
* Batching updates.


Example
-------

.. code:: python

   import gspread

   gc = gspread.service_account()

   # Open a spreadsheet by title
   sh = gc.open("Iris Data")

   # Get the first sheet
   wk = sh.sheet1

   # Update a range of cells using the top left corner address
   wk.update('A1', [['Species', 'Sepal length'], ['Iris setosa', 5.1]])

   # Format the header
   wk.format('A1:B1', {'textFormat': {'bold': True}})



License
-------
MIT


