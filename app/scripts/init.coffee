# Angular initialization only (and global scope handlers)
# use appropriate directories for controllers/directives etc.

angular_app = angular.module('jacs', [])

angular_app
.run(
  [
    "$rootScope",
    ($rootScope) ->
      # Global events such as $(window).resize
      return
  ]
)



