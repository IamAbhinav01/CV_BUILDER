# HI, make sure to pull this docker image from docker hub:

    ## docker pull minidocks/texlive:2023-medium

    ! after pulling this image , now install what all things are there inside the dockerfile.

    ## ** make sure to create ** a folder named cv-test inside of it drop your cv.tex file(latex code) and
    then run the cmd:

## docker run --rm -v %cd%:/work -w /work texlive-cv-custom pdflatex cv.tex

    ## and ALL SET
