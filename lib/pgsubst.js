var moment = require('moment');
var _ = require('underscore');

module.exports = function(sql, params)
{
    return substitute(sql, params);
}

// ____________________
//
//   Query Formatting
// ____________________
//

function substitute(sql, params)
{
    if (isNullOrUndefined(sql)) throw new Error('Argument \"sql\"" is null or undefined.');
    if (isNullOrUndefined(params)) params = {}; 

    return sql.replace(/:[a-zA-z_][a-zA-z0-9_$]*/g, function(match)
    {
        var identifier = match.substring(1);
        var value = values[identifier];
        
        if (value === undefined)
        {
            return match;
        }
        else
        {
            return exports.formatValue(value, false);
        }
    });
}

function format(val, forArray)
{
    if (isNullOrUndefined(val)) return 'NULL';
    var type = val.constructor.name;
    switch(type)
    {
        case 'Number':
            return val.toString();
        case 'Boolean':
            return val ? 'true' : 'false';
        case 'String':
            return string(val, forArray);
        case 'Array':
            return array(val, forArray);
        case 'Date':
            return formatDate(val, forArray);
        case 'Object':
            if (moment.isMoment(val))
                return formatMoment(val, forArray);
            else
                return formatJSON(val, forArray);
        default:
            throw new Error('Unhandled parameter type: ' + type);
    }
};

// ____________________
//
//   Strings
// ____________________
//

function string(str, forArray)
{
    return forArray ? stringForArray(str) : stringForQuery(str);
}

function stringForQuery(str)
{
    return 'E\'' + escapeStringForQuery(str) + '\'';
}

function escapeStringForQuery(str)
{
    return str.replace(/\\/g, '\\\\').replace(/\'/g, '\\\'');
}

function stringForArray(str)
{
    return '"' + escapeStringForArray(str) + '"';
}

function escapeStringForArray(str)
{
    return str.replace(/\"/g, '""');
}

// ____________________
//
//   Dates
// ____________________
//

function formatMoment(m, forArray)
{
    if (forArray)
    {
        return string(m.utc().format('YYYY-MM-DD HH:mm:ss'), true);
    }
    else
    {
        return string(m.utc().format('YYYY-MM-DD HH:mm:ss'), false) + '::timestamp with time zone';
    }
}

function formatDate(date, forArray)
{
    return formatMoment(moment(date), forArray);
}

// ____________________
//
//   Arrays
// ____________________
//

function array(items, forArray)
{
    return string('{' + _.map(items, formatForArray).join(',') + '}', forArray);
}

function formatForArray(item)
{
    return format(item, true);
}

// ____________________
//
//   JSON
// ____________________
//

function formatJSON(val, forArray)
{
    return string(JSON.stringify(val), forArray);
}

// ____________________
//
//   Misc.
// ____________________
//

function isNullOrUndefined(val)
{
    return val === null || val == undefined;
}