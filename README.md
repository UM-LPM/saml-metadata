# saml-metadata

This implementation is suitable for parsing large metadata files containing multiple IDPs and SPs as which commonly created by federations.
It parses and creates the data structure on the fly, that way the original document is never saved.
The parsing does not introduce a significant overhead, the document is usually parsed in the same amount of time it takes for the file to be downloaded.
The projects only dependency is the [saxes](https://www.npmjs.com/package/saxes) library.

The data structure fairly closely follows the [schema](https://docs.oasis-open.org/security/saml/v2.0/saml-schema-metadata-2.0.xsd) prescribed by the SAML specification. All standard constructs referenced in the [interoperable SAML](https://kantarainitiative.github.io/SAMLprofiles/saml2int.html) are supported (the extensions are currently missing, however they might be added in the future).

Security considerations:
- The well-formedness of the XML document is ensured by the underlaying SAX parser.
- The location of elements is always (transitively) verified from the root.
- The order of the elements is not verified.
- The XML signatures are not verified, it is assumed that the document is downloaded directly from a well-known location and the connection is protected using TSL/SSL.
- The elements that are not converted into the data structure are ignored.

## Usage

```ts
import {parser} from 'saml-metadata';

 https.get("url", async (stream) => {
   const metadata = await parser(stream);
 });
```

The types are at the beginning of [metadata.ts](https://github.com/UM-LPM/saml-metadata/blob/master/src/metadata.ts).

## License
ISC
