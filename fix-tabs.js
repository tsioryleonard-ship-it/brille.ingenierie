// =====================================================
// FIX-TABS.JS — Correctif onglets tranche d'âge BRILLE
// À placer dans le dossier du repo GitHub
// Ajouter dans chaque fichier pétale AVANT </body> :
//   <script src="fix-tabs.js"></script>
// =====================================================

(function() {

  // 1. Corriger showAge globalement
  window.showAge = function(age, btn) {
    document.querySelectorAll('.age-panel').forEach(function(p) {
      p.classList.remove('active');
      p.style.display = '';
    });
    document.querySelectorAll('.tab').forEach(function(t) {
      t.classList.remove('active');
      t.style.display = '';
    });
    var panel = document.getElementById('panel-' + age);
    if (panel) {
      panel.classList.add('active');
      panel.style.display = 'block';
    }
    // Récupérer le vrai bouton même si event.target est un enfant
    if (btn) {
      var realBtn = btn.closest ? btn.closest('.tab') : btn;
      if (realBtn) realBtn.classList.add('active');
    }
    // Mettre à jour le hash sans recharger
    if (history.replaceState) {
      history.replaceState(null, '', '#' + age);
    }
  };

  // 2. Corriger initAgeFromURL
  function initAgeFromURL() {
    var hash = window.location.hash.replace('#', '');
    var ages = ['6-7', '8-9', '10-12'];
    var validHash = ages.indexOf(hash) > -1 ? hash : null;

    // Masquer tous les panels
    document.querySelectorAll('.age-panel').forEach(function(p) {
      p.classList.remove('active');
      p.style.display = 'none';
    });

    // Afficher le bon panel
    var targetAge = validHash || '6-7';
    var target = document.getElementById('panel-' + targetAge);
    if (target) {
      target.style.display = 'block';
      target.classList.add('active');
    }

    if (validHash) {
      // Mode famille : masquer onglets, afficher badge fixe
      document.querySelectorAll('.tab').forEach(function(t) {
        t.style.display = 'none';
      });
      var nav = document.querySelector('nav .tabs');
      if (nav) {
        var ageLabels = {
          '6-7': '🌱 6–7 ans',
          '8-9': '🌿 8–9 ans',
          '10-12': '🌳 10–12 ans'
        };
        nav.innerHTML = '<span style="color:var(--peche);font-size:12px;font-weight:600;padding:6px 14px;background:rgba(255,255,255,0.1);border-radius:20px;">' + ageLabels[validHash] + '</span>';
      }
    } else {
      // Mode animateur : marquer l'onglet actif correspondant
      document.querySelectorAll('.tab').forEach(function(t) {
        t.style.display = '';
        t.classList.remove('active');
      });
      // Trouver l'onglet qui correspond à targetAge
      document.querySelectorAll('.tab').forEach(function(t) {
        var onclick = t.getAttribute('onclick') || '';
        if (onclick.indexOf("'" + targetAge + "'") > -1) {
          t.classList.add('active');
        }
      });
    }
  }

  // 3. Corriger les boutons onclick pour passer this
  function fixTabButtons() {
    document.querySelectorAll('.tab').forEach(function(btn) {
      var onclick = btn.getAttribute('onclick');
      if (onclick && onclick.indexOf(', this)') === -1) {
        // Remplacer showAge('x-x') par showAge('x-x', this)
        var fixed = onclick.replace(/showAge\('([^']+)'\)/, "showAge('$1', this)");
        btn.setAttribute('onclick', fixed);
      }
    });
  }

  // 4. Exécution
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      fixTabButtons();
      initAgeFromURL();
    });
  } else {
    fixTabButtons();
    initAgeFromURL();
  }

  window.addEventListener('hashchange', initAgeFromURL);

})();
