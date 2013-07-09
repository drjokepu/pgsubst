var assert = require('assert');
var moment = require('moment');
var pgsubst = require('../lib/pgsubst.js');

describe('formatValue', function()
{
    it('null', function()
    {
        assert.equal(pgsubst.format(null) , 'NULL');
    });
    
    it('integer', function()
    {
        assert.equal(pgsubst.format(9810) , '9810');
    });
    
    it('float', function()
    {
        assert.equal(pgsubst.format(120.1337) , '120.1337');
    });
    
    it('negative integer', function()
    {
        assert.equal(pgsubst.format(-1337) , '-1337');
    });
    
    it('string', function()
    {
        assert.equal(pgsubst.format('abcde') , 'E\'abcde\'');
    });
    
    it('string (escaped)', function()
    {
        assert.equal(pgsubst.format('ab\'cd\\\'e') , 'E\'ab\\\'cd\\\\\\\'e\'');
    });
    
    it('true', function()
    {
        assert.equal(pgsubst.format(true) , 'true');
    });
    
    it('false', function()
    {
        assert.equal(pgsubst.format(false) , 'false');
    });

    it('array of integers', function()
    {
            assert.equal(pgsubst.format([13, 5, 8]) , 'ARRAY[13,5,8]');
    });

    it('array of strings', function()
    {
        assert.equal(pgsubst.format(['a', 'b', 'c', '"', '\'']) ,
            'ARRAY[E\'a\',E\'b\',E\'c\',E\'"\',E\'\\\'\']');
    });

    it('array of strings (escaped) (simple)', function()
    {
        assert.equal(
            pgsubst.format(['\'']) ,
            'ARRAY[E\'\\\'\']');
    });

    it('array of strings (escaped)', function()
    {
        assert.equal(
            pgsubst.format(['a', '"\'\\b', 'c', '"']) ,
            'ARRAY[E\'a\',E\'"\\\'\\\\b\',E\'c\',E\'"\']');
    });

    it('moment', function()
    {
        assert.equal(pgsubst.format(moment.utc('1999-01-08 04:05:06')),
            'E\'1999-01-08 04:05:06\'::timestamp with time zone');
    });

    it('date', function()
    {
        assert.equal(pgsubst.format(new Date(1260434555444)),
            'E\'2009-12-10 08:42:35\'::timestamp with time zone');
    });

    it('json', function()
    {
        assert.equal(pgsubst.format({ id : 1, names: [ "test1", "test2" ] }),
            'E\'{"id":1,"names":["test1","test2"]}\'::json');
    });
});
        
describe('substitute', function()
{
    it('none (undefined)', function()
    {
        assert.equal(pgsubst('select 123') , 'select 123');
    });
    
    it('none (empty)', function()
    {
        assert.equal(pgsubst('select 123', {}) , 'select 123');
    });
    
    it('none (undefined) (with parameters)', function()
    {
        assert.equal(pgsubst(
            'select * from test where id = :id'),
            'select * from test where id = :id');
    });
    
    it('none (empty) (with parameters)', function()
    {
        assert.equal(pgsubst(
            'select * from test where id = :id', {}),
            'select * from test where id = :id');
    });
    
    it('integer (1)', function()
    {
        assert.equal(pgsubst(
            'select * from test where id = :id', { id: 123 }),
            'select * from test where id = 123');
    });

    it('integer (1, multi)', function()
    {
        assert.equal(pgsubst(
            'select * from test where id = :id or other_id = :id', { id: 123 }),
            'select * from test where id = 123 or other_id = 123');
    });
    
    it('string (1)', function()
    {
        assert.equal(pgsubst(
            'select * from test where name = :user_name', { id: 123, user_name: 'Jozef Ilyakovic' }),
            'select * from test where name = E\'Jozef Ilyakovic\'');
    });
    
    it('integer (2)', function()
    {
        assert.equal(pgsubst(
            'select * from test where id = :id and height > :height', { id: 800, height: 140 }),
            'select * from test where id = 800 and height > 140');
    });

    it('integer (in string)', function()
    {
        assert.equal(pgsubst(
            'select * from test where id = \':id\'', { id: 123 }),
            'select * from test where id = \':id\'');
    });

    it('integer (in escaped string)', function()
    {
        assert.equal(pgsubst(
            'select * from test where id = E\':id\'', { id: 123 }),
            'select * from test where id = E\':id\'');
    });

    it('integer (in escaped string, with escapes)', function()
    {
        assert.equal(pgsubst(
            'select * from test where id = E\'\\\':id\'', { id: 123 }),
            'select * from test where id = E\'\\\':id\'');
    });

    it('integer (in identifier)', function()
    {
        assert.equal(pgsubst(
            'select col0, ":id" from test where id = 400', { id: 123 }),
            'select col0, ":id" from test where id = 400');
    });

    it('comment only (single line)', function()
    {
        assert.equal(pgsubst(
            '-- comment'),
            '-- comment');
    });

    it('comment only (multi line)', function()
    {
        assert.equal(pgsubst(
            '/* comment */'),
            '/* comment */');
    });

    it('integer (in comment, single line)', function()
    {
        assert.equal(pgsubst(
            'select id from test where id = 400; -- :id is 400\nselect :id', { id: 123 }),
            'select id from test where id = 400; -- :id is 400\nselect 123');
    });

    it('integer (in comment, multi line)', function()
    {
        assert.equal(pgsubst(
            'select id from test where /* :id */ id = :id;', { id: 123 }),
            'select id from test where /* :id */ id = 123;');
    });

    it('integer (in comment, multi line, nested)', function()
    {
        assert.equal(pgsubst(
            'select id from test where /* :id /* :id */ :id */ id = :id;', { id: 123 }),
            'select id from test where /* :id /* :id */ :id */ id = 123;');
    });
});