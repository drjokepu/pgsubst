# pgsubst [![Build Status](https://travis-ci.org/drjokepu/pgsubst.png?branch=master)](https://travis-ci.org/drjokepu/pgsubst)
`pgsubst` substitutes named parameters with values within PostgreSQL queries.

## Usage
### pgsubst(sql, params)
Substitutes named parameters with values within PostgreSQL queries.

```JavaScript
var pgsubst = require("pgsubst");
var query = pgsubst("select name from product where id = :id", { id: 300 });
```

The value of `query` will be:
```SQL
select name from product where id = 300
```

It’s easy to use `pgsubst` with [node-postgres](https://github.com/brianc/node-postgres):
```JavaScript
pgClient.query(
  pgsubst("select name from product where id = :id", {
  id: 300
  }), function(err, result) {
    // do something…
  });
```

Strings and other quoted data types will be escaped correctly:
```JavaScript
pgsubst("select id from product where name = :name", { name: "'test'" });
```
will yield
```SQL
select id from product where name = E'\'test\''
```

The same parameter can be used any number of times:
```JavaScript
pgsubst("select name from product where id = :id or other_id = :id", { id: 300 });
```
will yield
```SQL
select name from product where id = 300 or other_id = 300
```

### pgsubst.format(val)
Converts JavaScript objects into equivalent strings that can be safely included in PostgreSQL query strings. `pgsubst(sql, params)` uses `pgsubst.format(val)` internally to substitute values.

```JavaScript
pgsubst.format('abc')
```
will yield
```JavaScript
"E'abc'"
```

```JavaScript
pgsubst.format(new Date(1260434555444))
```
will yield
```JavaScript
"E'2009-12-10 08:42:35'::timestamp with time zone"
```

```JavaScript
pgsubst.format([1, 2, 3])
```
will yield
```JavaScript
"ARRAY[1,2,3]"
```

```JavaScript
pgsubst.format({ id: 300 })
```
will yield
```JavaScript
"E'{id:300}'::json"
```

## Supported Types

* Array (of any of the supported types)
* Boolean
* Date (and [moment.js](http://momentjs.com) moments)
* Number
* Object (converted to JSON)
* String

## Bugs, Contributions, etc.

Bug reports and contributions are welcome on the github page: [https://github.com/drjokepu/pgsubst](https://github.com/drjokepu/pgsubst)
