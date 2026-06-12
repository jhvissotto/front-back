git init
git config --local user.name  "MA"
git config --local user.email "mikealvarrez.02@gmail.com"
git remote add     origin https://gitlab.com/mikealvarrez/front-back
git remote set-url origin https://gitlab.com/mikealvarrez/front-back
git add .
git commit -m "."
git push --set-upstream origin HEAD --force