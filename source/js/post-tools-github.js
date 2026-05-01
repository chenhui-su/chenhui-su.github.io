(function () {
  function insertGitHubButton() {
    document.querySelectorAll('.post-tools-left .shareRight').forEach(function (shareRight) {
      if (shareRight.querySelector('.share-link.github-profile')) return;

      var wrapper = document.createElement('div');
      wrapper.className = 'share-link github-profile';
      wrapper.innerHTML = [
        '<a class="share-button"',
        ' href="https://github.com/chenhui-su"',
        ' target="_blank"',
        ' rel="external nofollow noreferrer noopener"',
        ' title="GitHub">',
        '<i class="anzhiyufont anzhiyu-icon-github"></i>',
        '</a>'
      ].join('');

      var copyUrlButton = shareRight.querySelector('.share-link.copyurl');
      if (copyUrlButton) {
        shareRight.insertBefore(wrapper, copyUrlButton);
        return;
      }

      shareRight.appendChild(wrapper);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', insertGitHubButton);
  } else {
    insertGitHubButton();
  }

  document.addEventListener('pjax:complete', insertGitHubButton);
})();
