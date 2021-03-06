/**
 * Created by vivek on 12/8/16.
 */
(function () {
    'use strict';

    var core = require('./lib/core');
    var db = require('./lib/db');

    angular.module('musik')
        .controller('HomeController', ['$scope', '$filter', '$mdToast', function ($scope, $filter, $mdToast) {
            $scope.musicPath = null;
            $scope.songs = [];
            $scope.albumSongs = [];
            $scope.isSongsEmpty = false;
            $scope.showSongs = true;
            $scope.showFavorites = false;
            $scope.queue = [];
            $scope.songsFilePaths = [];
            $scope.currentSong = null;
            $scope.progress = 0;
            $scope.volume = 0.5;

            $scope.isPlaying = false;

            $scope.sortType = 'title';
            $scope.sortReverse = false;

            $scope.selectFile = function () {
                document.getElementById('musicPath').click();
            };

            var toast = $mdToast.simple().position('top right');

            function init() {
                db.getAllSongs()
                    .then(function (songs) {
                        // if (songs.length > 0) $mdToast.show(toast.content('Songs loaded'));
                        $scope.$apply(function () {
                            $scope.songs = songs;
                            $scope.isSongsEmpty = (songs.length === 0);
                        });
                    })
                    .catch(function (err) {
                        throw err;
                    });
            }

            init();

            $scope.triggerAudio = function (song) {
                if (!song) return;

                if ($scope.currentSong && song.id === $scope.currentSong.id) {
                    if ($scope.isPlaying) {
                        Player.pause();
                        $scope.isPlaying = false;
                    } else {
                        Player.play();
                        $scope.isPlaying = true;
                    }
                } else {
                    $scope.currentSong = song;
                    Player.setAttribute('src', song.path);
                    Player.play();
                    $scope.isPlaying = true;
                    if ($scope.albumSongs.length > 0) {
                        $scope.queue = $scope.albumSongs.slice($scope.albumSongs.indexOf(song) + 1);
                    } else {
                        $scope.queue = $scope.songs.slice($scope.songs.indexOf(song) + 1);
                    }
                }
            };

            $scope.triggerFavorite = function (song, index) {
                var isFavorite = (song.isFavorite === undefined) ? true : !song.isFavorite;
                db.updateSong(song.id, { isFavorite: isFavorite }).then(function (songUpdated) {
                        song.isFavorite = isFavorite;
                        $scope.$apply(function () {
                            $scope.songs[index] = song;
                            if ($scope.showFavorites) {
                                $scope.songs = $filter('filter')($scope.songs, { isFavorite: true });
                            }
                        });
                    })
                    .catch(function (err) {
                        console.log(err);
                    });
            };

            $scope.getFavorites = function () {
                $scope.showFavorites = !$scope.showFavorites;
                if (!$scope.showFavorites) {
                    $scope.songsView();
                } else {
                    $scope.songs = $filter('filter')($scope.songs, { isFavorite: true });
                }
            };

            $scope.songsView = function () {
                init();
                $scope.showSongs = true;
                $scope.showFavorites = ($scope.showFavorites) ? false : $scope.showFavorites;
                $scope.albumSongs = [];
            };

            $scope.play = function () {
                $scope.triggerAudio($scope.currentSong || $scope.queue[0]);
            };

            $scope.formatTime = function (inSeconds) {
                var minutes = Math.floor(inSeconds / 60);
                minutes = (minutes >= 10) ? minutes : "0" + minutes;
                var seconds = Math.floor(inSeconds % 60);
                seconds = (seconds >= 10) ? seconds : "0" + seconds;
                return minutes + ":" + seconds;
            };

            var Player = document.getElementById('player');

            Player.addEventListener('timeupdate', function () {
                $scope.$apply(function () {
                    $scope.progress = player.currentTime * 100 / player.duration;
                    $scope.time = $scope.formatTime(player.currentTime);
                });
            }, false);

            Player.addEventListener('ended', function () {
                $scope.playNext();
            }, false);

            var timeline = document.getElementById('timeline');

            timeline.addEventListener('click', function (e) {
                if (!$scope.currentSong) return;
                Player.currentTime = $scope.currentSong.duration * e.clientX / timeline.offsetWidth;
            }, false);

            $scope.playNext = function () {
                $scope.triggerAudio($scope.queue.shift());
            };

            $scope.playPrevious = function () {
                var index = $scope.songs.indexOf($scope.currentSong);
                if (index !== -1 && $scope.songs[--index]) {
                    $scope.triggerAudio($scope.songs[index]);
                }
            };

            $scope.$watch('volume', function (newVolume, oldVolume) {
                Player.volume = newVolume;
            });

            $scope.albums = [];
            $scope.checkAlbumDuplicates = [];  // album name

            $scope.albumView = function () {
                $scope.songs.forEach(function (song) {
                    if ($scope.checkAlbumDuplicates.indexOf(song.album) === -1) {
                        var album = {
                            album: song.album || 'Unknown',
                            albumImage: ''
                        };
                        if (song.albumArt && song.albumArt.data && song.albumArt.format) {
                            album.albumImage = window.URL.createObjectURL(new Blob([song.albumArt.data], {type: 'image/' + song.albumArt.format}));
                        }
                        $scope.albums.push(album);
                        $scope.checkAlbumDuplicates.push(song.album);
                        album = null;
                    }
                });
                $scope.showSongs = false;
            };

            $scope.$watch('sortReverse', function (newVal, oldVal) {
                $scope.songs = $filter('orderBy')($scope.songs, $scope.sortType, newVal);
                if ($scope.currentSong) {
                    $scope.queue = $scope.songs.slice($scope.songs.indexOf($scope.currentSong) + 1);
                }
            });

            $scope.removeFromQueue = function (song, e) {
                var queueIndex = $scope.queue.indexOf(song);
                if (queueIndex !== -1) {
                    $scope.queue.splice(queueIndex, 1);
                }
            };

            /**
             * Album Module
             */
            $scope.openAlbum = function (album) {
                $scope.albumSongs = $scope.songs.filter(function (song) {
                   return song.album === album.album;
                });
            };

        }]);

})();