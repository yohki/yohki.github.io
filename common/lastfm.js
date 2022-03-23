var LastFm = (function() {

    var METHODS = {
        GET_TOKEN: "auth.getToken",
        GET_SESSION: "auth.getSession",
        GET_ARTIST_INFO: "artist.getInfo",
        GET_TOP_ARTISTS: "chart.gettopartists",
        GET_TOP_ALBUMS: "artist.gettopalbums",
        GET_TOP_TRACKS: "chart.gettoptracks",
        GET_TAG_TRACKS: "tag.gettoptracks",
        GET_ALBUM_INFO: "album.getinfo",
        GET_TAG_ALBUMS: "tag.getTopAlbums",
        GET_TAG_ARITSTS: "tag.gettopartists",
        RADIO_SEARCH: "radio.search",
        RADIO_TUNE: "radio.tune",
        RADIO_PLAYLIST: "radio.getPlaylist"
    };
    var token = null;
    var sessionKey = null;

    return {
        getTopArtists: function(length, tag) {
            var params = new LastFm.Parameters();
            if (tag === undefined || tag == "") {
                params.add("method", METHODS.GET_TOP_ARTISTS);
            } else {
                params.add("method", METHODS.GET_TAG_ARITSTS);
                params.add("tag", tag);
            }
            params.add("limit", length);
            params.add("page", 1);
            var url = params.formatJSONUrl();
            jQuery.support.cors = true;
            return $.getJSON(url);
        },
        getArtistInfo: function(artist) {
            var params = new LastFm.Parameters();
            params.add("method", METHODS.GET_ARTIST_INFO);
            params.add("artist", artist);
            var url = params.formatJSONUrl();
            jQuery.support.cors = true;
            return $.getJSON(url);
        },
        getTopAlbums: function(artist) {
            var params = new LastFm.Parameters();
            params.add("method", METHODS.GET_TOP_ALBUMS);
            params.add("artist", artist);
            var url = params.formatJSONUrl();
            jQuery.support.cors = true;
            return $.getJSON(url);
        },
        getTopTaggedAlbums: function(length, tag) {
            var params = new LastFm.Parameters();
            params.add("method", METHODS.GET_TAG_ALBUMS);
            params.add("tag", tag);
            params.add("limit", length);
            var url = params.formatJSONUrl();
            jQuery.support.cors = true;
            return $.getJSON(url);
        },
        getTopTracks: function(length, tag) {
            var params = new LastFm.Parameters();
            if (tag === undefined || tag == "") {
                params.add("method", METHODS.GET_TOP_TRACKS);
            } else {
                params.add("method", METHODS.GET_TAG_TRACKS);
                params.add("tag", tag);
            }
            params.add("limit", length);
            var url = params.formatJSONUrl();
            jQuery.support.cors = true;
            return $.getJSON(url);
        },
        getAlbumInfo: function(mbid) {
            var params = new LastFm.Parameters();
            params.add("method", METHODS.GET_ALBUM_INFO);
            params.add("mbid", mbid);
            var url = params.formatJSONUrl();
            jQuery.support.cors = true;
            return $.getJSON(url);
        },
        downloadImage: function(url) {
            var uri = Windows.Foundation.Uri(url);
            var tmpFolder = Windows.Storage.ApplicationData.current.temporaryFolder;
            var filename = url.substring(url.lastIndexOf("/") + 1, url.length);
            var def = $.Deferred();
            tmpFolder.createFileAsync(filename, Windows.Storage.CreationCollisionOption.replaceExisting).then(function(file) {
                var downloader = new Windows.Networking.BackgroundTransfer.BackgroundDownloader();
                var dl = downloader.createDownload(uri, file);
                dl.startAsync().then(function(evt) {
                    def.resolve(evt.resultFile.path);
                }, function(evt) {
                    console.log("Download Error: " + url);
                });
            });

            // expose jQuery Deferred object rather than WinJS.Promise
            return def.promise();
        }
    };

})();



//
// Parameter object
//

LastFm.Parameters = function() {
    if (!(this instanceof LastFm.Parameters)) {
        return new LastFm.Parameters();
    }

    var BASE_URL = "http://ws.audioscrobbler.com/2.0/";
    var API_KEY = "ed232ce0e3953a32405759b032a14b5a";
    var SECRET = "3309c5bda2a41f0c45c3930c1494e6c3";

    var keys = ["api_key"];
    var data = { "api_key": API_KEY };


    var formatJSONUrl = function() {
        var url = BASE_URL + "?";
        for (var i = 0; i < keys.length; i++) {
            url += keys[i] + "=" + data[keys[i]] + "&";
        }
        url += "format=json";
        console.log(url);
        return url;
    };

    var add = function(key, value) {
        if (-1 == keys.indexOf(key)) {
            keys.push(key);
        }
        data[key] = value;
    }

    var addSignature = function() {
        // sort keys
        keys.sort();

        // concatenate parameters
        var str = "";
        for (var i = 0; i < keys.length; i++) {
            str = str + keys[i] + data[keys[i]];
        }
        str += SECRET;
        console.log("Before MD5: " + str);
        // get MD5 hash
        var hash = hex_md5(str);
        console.log("After MD5: " + hash);
        add("api_sig", hash);
    };

    return {
        add: add,
        formatJSONUrl: formatJSONUrl
    };
};
