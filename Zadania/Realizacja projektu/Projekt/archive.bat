git init
git config --local user.name "projekt"
git config --local user.email "projekt@ur.edu.pl"
git add --all
git commit -m "Projekt Zarzadzanie Wycieczkami"
git archive --format=zip HEAD -o ../zarzadzanie_wycieczkami_archiwum.zip
pause