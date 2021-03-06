/****************************************************************
 * EmailsValidator library 
 * https://github.com/RomainVialard/Emails-Validator
 *
 * Returns a list of valid email addresses
 * contained in a given string
 * -- Created for Yet Another Mail Merge --
 *
 * cleanUpEmailList()
 * cleanUpSingleAddress()
 * generateDisplayName()
 * isEmail()
 *
 * _initDiacriticsMap()
 * _removeDiacritics()
 *****************************************************************//**/


/**
 * Compute a list of valid email addresses contained in a given string
 * while accepting the syntax "User Name" <someone@gmail.com>
 *
 * @example
 * // returns ["me@gmail.com", "other@gmail.com"]
 * EmailsValidator.cleanUpEmailList("me@gmail.com, some text, other@gmail.com");
 *
 * @example
 * // returns ["me@gmail.com", "eleve1@gmail.com"]
 * EmailsValidator.cleanUpEmailList("me@gmail.com, élève1@gmail.com");
 *
 * @params
 * @param {string} emails - a string containing email addresses
 *
 * @param {object} [options] - Options for email cleaning
 * @param {boolean} [options.onlyReturnEmails] - Set to true to remove any associated display name, eg: toto Shinnigan <user@gmail.com> --> user@gmail.com
 * @param {boolean} [options.onlyReturnNames] - Set to true to remove any associated display email, eg:  toto.shinnigan@gmail.com --> Toto Shinnigan, eg: "John Doe" <toto.shinnigan@gmail.com> --> John Doe
 * @param {boolean} [options.addDisplayNames] - Set to true to generate display names for all addresses, eg: toto.shinnigan@gmail.com --> "Toto Shinnigan" <toto.shinnigan@gmail.com>
 * @param {boolean} [options.logGarbage] - Log all entries not containing a valid email
 *
 * @return {Array<string>} a list of valid email addresses, can be formatted like: "Name Name" <email@domain.com>
 */
function cleanUpEmailList(emails, options) {
  // Set default options value
  options = options || {};
  options = {
    onlyReturnEmails: options.onlyReturnEmails || false,
    onlyReturnNames: options.onlyReturnNames || false,
    addDisplayNames: options.onlyReturnNames || options.addDisplayNames || false,
    logGarbage: options.logGarbage || false
  };
  
  if (options.onlyReturnEmails && options.addDisplayNames) throw new Error("Can't set both @onlyReturnEmails & @addDisplayNames to true");
  
  
  // Remove double @ (yes, we have to do this...)
  emails = emails.replace('@@', '@');
  
  // If no @, no valid address, quit early
  if (emails.indexOf('@') === -1) return [];
  
  // One time init the diacritics map
  EmailsValidator_._initDiacriticsMap();
  
  var regEmailSeparator = new RegExp(EmailsValidator_._REGEX_SEPARATE_EMAILS);
  var extractRes;
  var validFields = [];
  
  // Extract and separate every email like field
  while (extractRes = regEmailSeparator.exec(emails)){
    // noinspection JSAnnotator
    var [/* full matching string */, field, quotedPart, emailPart] = extractRes;
    
    // Search for the email: remove white spaces, then separate the content
    var res = EmailsValidator_._REGEX_EXTRACT_INFO.exec((emailPart || field).replace(/\s/g, ''));
    
    // Safety check (will happens if no valid localPart is found)
    if (!res){
      // Log for reference
      options.logGarbage && console.info({
        message: 'EmailsValidator: invalid field',
        field: field
      });
      
      continue;
    }
    
    // noinspection JSAnnotator
    var [/* full matching string */, displayName, localPart, rest] = res;
    
    // Prepare email part
    var email = EmailsValidator_._removeDiacritics(localPart +'@'+ rest);
    var emailRes = EmailsValidator_._REGEX_FIND_EMAIL.exec(email);
    
    // no valid email found even after removing the diacritics
    if (!emailRes){
      // Log for reference
      options.logGarbage && console.info({
        message: 'EmailsValidator: invalid email',
        email: localPart +'@'+ rest
      });
      
      continue;
    }
    
    // now we at least got a valid email (in lower case)
    email = emailRes[0].toLowerCase();
    
    
    if (!options.onlyReturnEmails){
      // Try to prepare the displayName if any
      displayName = quotedPart || displayName.replace(/["<>]/g, '').trim();
      
      // Add a displayName from localPart if necessary
      if (!displayName && options.addDisplayNames) {
        // Apply Title Case: toto shinnigan-michel --> Toto Shinnigan-Michel
        displayName = generateDisplayName(localPart);
      }
      
      if (displayName) {
        email = options.onlyReturnNames
          ? displayName
          : '"'+ displayName +'" <'+ email +'>';
      }
    }
    
    // Save final result
    validFields.push(email);
  }
  
  return validFields;
}

/**
 * Clean up a single email address by removing white-space characters
 *
 * @param {string} potentially dirty email address
 *
 * @return {string} cleaned-up email address ("Hervé.Du Chène@gmail.com" --> "herve.duchene@gmail.com") or null
 */
function cleanUpSingleAddress(email) {
  return cleanUpEmailList(email, {
    onlyReturnEmails: true
  })[0];
}

/**
 * Generate a display name from the local part of an email.
 * Words will be capitalized when separated by '.' or '-'
 *
 * @param {string} email
 *
 * @return {string} name extracted from email ("example.foo@domain.com" --> "Example Foo")
 */
function generateDisplayName(email) {
  var localPart = email.split('@')[0];
  
  // Capitalize by '.' | '_' and replace by spaces
  var displayName = localPart.split(/[._]/)
    .map(function (x) {
      return x && x[0].toUpperCase() + x.slice(1)
    })
    .join(' ');
  
  // Capitalize by '-'
  displayName = displayName.split('-')
    .map(function (x) {
      return x && x[0].toUpperCase() + x.slice(1)
    })
    .join('-');
  
  // Remove trailing numbers
  // john.doe0149@gmail.com >> John Doe0149 >> John Doe
  displayName = displayName.replace(/\d+$/, "");
  
  return displayName;
}

/**
 * Check email address validity
 *
 * @param {string} email - String containing a single email to validate
 *
 * @return {Boolean} true if the email address is valid, false otherwise
 */
function isEmail(email) {
  return EmailsValidator_._REGEX_VALID_EMAIL.test(email);
}


// noinspection JSUnusedGlobalSymbols, ThisExpressionReferencesGlobalObjectJS
this['EmailsValidator'] = {
  // Add local alias to run the library as normal code
  cleanUpEmailList: cleanUpEmailList,
  cleanUpSingleAddress: cleanUpSingleAddress,
  generateDisplayName: generateDisplayName,
  isEmail: isEmail
};


//<editor-fold desc="# Private methods">

var EmailsValidator_ = {};

EmailsValidator_._REGEX_SEPARATE_EMAILS = /([^@"]*?"([^"]*)"\s+<([^@]+?@[^@]+?)|[^@]+?@[^@]+?)(?:[,;\s\/]+|$)/g;
EmailsValidator_._REGEX_EXTRACT_INFO = /(.*?)((?:[^<>()\[\]\\.,;:\s@"]+(?:\.[^<>()\[\]\\.,;:\s@"]+)*))@(.+)$/;
EmailsValidator_._REGEX_FIND_EMAIL =   /[^<>()\[\]\\.,;:\s@"]+(?:\.[^<>()\[\]\\.,;:\s@"]+)*@(?:(?:\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(?:(?:[a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;
EmailsValidator_._REGEX_VALID_EMAIL = /^[^<>()\[\]\\.,;:\s@"]+(?:\.[^<>()\[\]\\.,;:\s@"]+)*@(?:(?:\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(?:(?:[a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
EmailsValidator_._REGEX_CLEAN_NAME_INFO = /["<>]/g;

/**
 * Replace accentuated letters (diacritics) by their non-accentuated counter part (à -> a)
 *
 * Reference: https://stackoverflow.com/questions/990904/remove-accents-diacritics-in-a-string-in-javascript
 *
 * @param {string} str
 *
 * @return {string}
 */
EmailsValidator_._removeDiacritics = function (str) {
  var res = str.toLowerCase();
  
  // Replace all char except the first 127 ASCII char
  res = res.replace(/[^\u0000-\u007E]/g, function (a) {
    return EmailsValidator_._diacriticsMap[a] || a;
  });
  
  return res;
};

/**
 * One time initialization of the diacritics maps
 */
EmailsValidator_._initDiacriticsMap = function () {
  // Skip if done
  if (EmailsValidator_._diacriticsMap) {
    return;
  }
  
  // build diacritics map
  var diacriticsMap = {};
  
  for (var i = 0; i < EmailsValidator_._DEFAULT_DIACRITICS.length; i++) {
    var letters = EmailsValidator_._DEFAULT_DIACRITICS[i].letters;
    
    for (var j = 0; j < letters.length; j++) {
      diacriticsMap[letters[j]] = EmailsValidator_._DEFAULT_DIACRITICS[i].base;
    }
  }
  
  EmailsValidator_._diacriticsMap = diacriticsMap;
};
EmailsValidator_._DEFAULT_DIACRITICS = [
  {
    'base': 'a',
    'letters': '\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250'
  },
  {
    'base': 'aa',
    'letters': '\uA733'
  },
  {
    'base': 'ae',
    'letters': '\u00E6\u01FD\u01E3'
  },
  {
    'base': 'ao',
    'letters': '\uA735'
  },
  {
    'base': 'au',
    'letters': '\uA737'
  },
  {
    'base': 'av',
    'letters': '\uA739\uA73B'
  },
  {
    'base': 'ay',
    'letters': '\uA73D'
  },
  {
    'base': 'b',
    'letters': '\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253'
  },
  {
    'base': 'c',
    'letters': '\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184'
  },
  {
    'base': 'd',
    'letters': '\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A'
  },
  {
    'base': 'dz',
    'letters': '\u01F3\u01C6'
  },
  {
    'base': 'e',
    'letters': '\u00E9\u0065\u24D4\uFF45\u00E8\u0065\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD'
  },
  {
    'base': 'f',
    'letters': '\u0066\u24D5\uFF46\u1E1F\u0192\uA77C'
  },
  {
    'base': 'g',
    'letters': '\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F'
  },
  {
    'base': 'h',
    'letters': '\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265'
  },
  {
    'base': 'hv',
    'letters': '\u0195'
  },
  {
    'base': 'i',
    'letters': '\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131'
  },
  {
    'base': 'j',
    'letters': '\u006A\u24D9\uFF4A\u0135\u01F0\u0249'
  },
  {
    'base': 'k',
    'letters': '\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3'
  },
  {
    'base': 'l',
    'letters': '\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747'
  },
  {
    'base': 'lj',
    'letters': '\u01C9'
  },
  {
    'base': 'm',
    'letters': '\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F'
  },
  {
    'base': 'n',
    'letters': '\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5'
  },
  {
    'base': 'nj',
    'letters': '\u01CC'
  },
  {
    'base': 'o',
    'letters': '\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275'
  },
  {
    'base': 'oi',
    'letters': '\u01A3'
  },
  {
    'base': 'ou',
    'letters': '\u0223'
  },
  {
    'base': 'oo',
    'letters': '\uA74F'
  },
  {
    'base': 'p',
    'letters': '\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755'
  },
  {
    'base': 'q',
    'letters': '\u0071\u24E0\uFF51\u024B\uA757\uA759'
  },
  {
    'base': 'r',
    'letters': '\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783'
  },
  {
    'base': 's',
    'letters': '\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B'
  },
  {
    'base': 't',
    'letters': '\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787'
  },
  {
    'base': 'tz',
    'letters': '\uA729'
  },
  {
    'base': 'u',
    'letters': '\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289'
  },
  {
    'base': 'v',
    'letters': '\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C'
  },
  {
    'base': 'vy',
    'letters': '\uA761'
  },
  {
    'base': 'w',
    'letters': '\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73'
  },
  {
    'base': 'x',
    'letters': '\u0078\u24E7\uFF58\u1E8B\u1E8D'
  },
  {
    'base': 'y',
    'letters': '\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF'
  },
  {
    'base': 'z',
    'letters': '\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763'
  }
];

//</editor-fold>
