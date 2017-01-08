/*
 MIT License

 Copyright (c) 2016 Ralf Th. Pietsch <ratopi@abwesend.de>

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */

const fs = require( "fs" );

const clone =
	function ( o )
	{
		return JSON.parse( JSON.stringify( o ) );
	};

const getArguments =
	function ( fn )
	{
		const process = require( "process" );

		if ( process.argv.length < 4 )
		{
			console.error();
			console.error( "Usage: " + process.argv[ 0 ] + " " + process.argv[ 1 ] + " <wordpress xml file> <target dir>" );
			console.error();
		}
		else
		{
			fn(
				process.argv[ 2 ],
				process.argv[ 3 ]
			);
		}
	};

const readWordpressFile =
	function ( filename, fun )
	{
		const xml2js = require( 'xml2js' );

		const parser = new xml2js.Parser();

		fs.readFile(
			filename,
			function ( err, data )
			{
				parser.parseString(
					data,
					function ( err, result )
					{
						fun( result );
					}
				)
			}
		);
	};

const convertWordpressFile =
	function ( filename, targetDir, defaults )
	{
		const yamljs = require( "yamljs" );

		const writeConfigYaml =
			function ( channel )
			{
				const config = {};

				config.title = channel.title[ 0 ];
				config.description = channel.description[ 0 ];
				config.link = channel.link[ 0 ];
				config.language = channel.language[ 0 ];

				fs.writeFileSync( targetDir + "/_config.yml", yamljs.stringify( config ) );
			};

		const writeItem =
			function ( item )
			{
				const getValue =
					function ( key )
					{
						const entry = item[ key ];
						return entry && entry.length === 1 ? entry[ 0 ] : undefined;
					};

				const writePost =
					function ( item )
					{
						const SEPARATOR = "---\n";


						const postDate = new Date( getValue( "wp:post_date" ) );

						const createFilename =
							function ()
							{
								var path = targetDir + "/_posts/";
								fs.existsSync( path ) || fs.mkdirSync( path );

								path += postDate.toISOString().replace( /T.*/, "" );

								var filename = getValue( "wp:post_name" );
								filename = (filename ? filename : getValue( "wp:post_id" )) + ".md";

								return path + "-" + filename;
							};


						const meta = clone( defaults.post );

						meta.title = getValue( "title" );
						meta.description = getValue( "description" );
						meta.status = getValue( "wp:status" );
						// TODO: category <- item.category

						const content = item[ "content:encoded" ];

						fs.writeFileSync(
							createFilename(),
							SEPARATOR +
							yamljs.stringify( meta ) +
							SEPARATOR +
							content
						);
					};

				const handlers =
				{
					"post": writePost
				};

				const postType = getValue( "wp:post_type" );

				const handler = handlers[ postType ];

				handler ? handler( item ) : console.log( "Unknown post type : " + postType );
			};

		const handleWordpressXml =
			function ( data )
			{
				const channel = data.rss.channel[ 0 ];

				writeConfigYaml( channel );

				channel.item.forEach(
					function ( item )
					{
						writeItem( item );
					}
				)
			};

		fs.existsSync( targetDir ) || fs.mkdirSync( targetDir );

		readWordpressFile( filename, handleWordpressXml );
	};


getArguments(
	function ( filename, targetDir )
	{
		convertWordpressFile(
			filename,
			targetDir,
			{
				"post": {
					"layout": "blog_post"
				}
			}
		);
	}
);

