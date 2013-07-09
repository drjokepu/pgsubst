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
        var value = params[identifier];
        
        if (value === undefined)
        {
            return match;
        }
        else
        {
            return format(value);
        }
    });
}

function format(val)
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
            return string(val);
        case 'Array':
            return array(val);
        case 'Date':
            return formatDate(val);
        case 'Object':
            if (moment.isMoment(val))
            {
                return formatMoment(val);
            }
            else
            {
                return formatJSON(val);
            }
        default:
            throw new Error('Unhandled parameter type: ' + type);
    }
};

module.exports.format = format;

// ____________________
//
//   Strings
// ____________________
//

function string(str)
{
    return 'E\'' + escapeString(str) + '\'';
}

function escapeString(str)
{
    return str.replace(/\\/g, '\\\\').replace(/\'/g, '\\\'');
}

// ____________________
//
//   Dates
// ____________________
//

function formatMoment(m)
{
    return string(m.utc().format('YYYY-MM-DD HH:mm:ss'), false) + '::timestamp with time zone';
}

function formatDate(date)
{
    return formatMoment(moment(date));
}

// ____________________
//
//   Arrays
// ____________________
//

function array(items)
{
    return 'ARRAY[' + _.map(items, format).join(',') + ']';
}

// ____________________
//
//   JSON
// ____________________
//

function formatJSON(val)
{
    return string(JSON.stringify(val)) + '::json';
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