# saml-metadata

[![CI](https://github.com/UM-LPM/saml-metadata/actions/workflows/node.js.yml/badge.svg)](https://github.com/UM-LPM/saml-metadata/actions/workflows/node.js.yml)

This is a streaming SAML metadata parser.
It is sutable for parsing large metadata files (multiple MBs) containing multiple IDPs and SPs, which are commonly used by federations.
The file is parsed and processed as it is being downloaded, which means the original document is never saved.
The projects only dependency is the SAX parsing library, [saxes](https://www.npmjs.com/package/saxes).

The data structure fairly closely follows the [schema](https://docs.oasis-open.org/security/saml/v2.0/saml-schema-metadata-2.0.xsd). 
All standard constructs referenced in the [interoperable SAML](https://kantarainitiative.github.io/SAMLprofiles/saml2int.html) are supported (the extensions are currently missing, however they might be added in the future).

Security considerations:
- The well-formedness of the XML document is ensured by the underlaying SAX parser.
- The location of elements is always (transitively) verified from the root.
- The order of the elements is not verified.
- The XML signatures are not verified, it is assumed that the document is downloaded directly from a well-known location and the connection is protected using TSL/SSL.
- The elements that are not converted into the data structure are ignored.

## Usage

```ts
import https from 'node:https';
import {parser} from 'saml-metadata';

https.get(address, (stream) => {
  void (async () => {
     const metadata = await parser(stream);
  })();
});
```

The types are in [types.ts](https://github.com/UM-LPM/saml-metadata/blob/master/src/types.ts).

## License
ISC
