var moment = require('moment');
var _ = require('underscore');

module.exports = function(sql, params)
{
    return parse(sql, params);
}

// ________________________________
//
//   Query parsing and formatting
// ________________________________
//

function parse(sql, params)
{
    if (isNullOrUndefined(sql)) throw new Error('Argument \"sql\"" is null or undefined.');
    if (isNullOrUndefined(params)) params = {}; 

    // parse the query with a very simple state machine
    var output = [], paramName = null, state = null, commentNestingDepth = 0;
    for (var i = 0; i < sql.length; i++)
    {
        var symbol = sql[i];
        switch (state)
        {
            case null:
                switch(symbol)
                {
                    case '"':
                        state = '"';
                        output.push(symbol);
                        break;
                    case '\'':
                        if (i === 0 || sql[i - 1] !== 'E')
                        {
                            state = '\'';
                        }
                        else
                        {
                            state = 'E\'';
                        }
                        output.push(symbol);
                        break;
                    case ':':
                        state = ':';
                        paramName = [];
                        break;
                    case '-':
                        if (sql.length > i + 1 && sql[i + 1] == '-')
                        {
                            i++;
                            output.push('--');
                            state = '--';
                        }
                        else
                        {
                            output.push(symbol);
                        }
                        break;
                    case '/':
                        if (sql.length > i + 1 && sql[i + 1] == '*')
                        {
                            i++;
                            output.push('/*');
                            state = '/*';
                            commentNestingDepth = 1;
                        }
                        else
                        {
                            output.push(symbol);
                        }
                        break;
                    default:
                        output.push(symbol);
                        break;
                }
                break;
            case '"':
                switch(symbol)
                {
                    case '"':
                        state = null;
                        output.push(symbol);
                        break;
                    case '\\':
                        state = '"\\';
                        output.push(symbol);
                        break;
                    default:
                        output.push(symbol);
                        break;
                }
                break;
            case '"\\':
                state = '"';
                output.push(symbol);
                break;
            case '\'':
                if (symbol === '\'')
                    state = null;
                output.push(symbol);
                break;
            case 'E\'':
                switch(symbol)
                {
                    case '\'':
                        state = null;
                        output.push(symbol);
                        break;
                    case '\\':
                        state = 'E\'\\';
                        output.push(symbol);
                        break;
                    default:
                        output.push(symbol);
                        break;
                }
                break;
            case 'E\'\\':
                state = 'E\'';
                output.push(symbol);
                break;
            case ':':
                if (isValidParamHeadSymbol(symbol))
                {
                    paramName.push(symbol);
                    state = ':+';
                }
                else
                {
                    output.push(':' + symbol);
                    state = null;
                }
                break;
            case ':+':
                if (isValidParamTailSymbol(symbol))
                {
                    paramName.push(symbol);
                }
                else
                {
                    output.push(substitute(paramName.join(''), params));
                    output.push(symbol);
                    paramName = null;
                    state = null;
                }
                break;
            case '--':
                if (symbol === '\n')
                {
                    state = null;
                }
                output.push(symbol);
                break;
            case '/*':
                switch(symbol)
                {
                    case '/':
                        if (sql.length > i + 1 && sql[i + 1] == '*')
                        {
                            i++;
                            output.push('/*');
                            commentNestingDepth++;
                        }
                        else
                        {
                            output.push(symbol);
                        }
                        break;
                    case '*':
                        if (sql.length > i + 1 && sql[i + 1] == '/')
                        {
                            i++;
                            output.push('*/');
                            commentNestingDepth--;
                            if (commentNestingDepth === 0)
                            {
                                state = null;
                            }
                        }
                        else
                        {
                            output.push(symbol);
                        }
                        break;
                    default:
                        output.push(symbol);
                        break;
                }
                break;
            default:
                throw new Error('Invalid parser state: ' + state);
        }
    }

    if (state === ':')
    {
        output.push(':');
    }
    else if (state === ':+')
    {
        output.push(substitute(paramName.join(''), params));
    }

    return output.join('');
}

function substitute(identifier, params)
{
    var value = params[identifier];
    if (value === undefined)
    {
        return ':' + identifier;
    }
    else
    {
        return format(value);
    }
}

function isValidParamHeadSymbol(symbol)
{
    return between(symbol, 'a', 'z') || between(symbol, 'A', 'Z') || symbol === '_';
}

function isValidParamTailSymbol(symbol)
{
    return between(symbol, 'a', 'z') || between(symbol, 'A', 'Z') || symbol === '_' ||
        symbol === '$' || between(symbol, '0', '9');
}

function between(symbol, symbol0, symbol1)
{
    return (symbol >= symbol0) && (symbol <= symbol1);
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
        case 'Moment':
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