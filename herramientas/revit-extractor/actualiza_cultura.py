"""Atajo: python actualiza_cultura.py <lectura.jsonl.gz>  =  actualiza_vinculo.py cultura <lectura>."""
import sys
from actualiza_vinculo import run

if __name__ == "__main__":
    run("cultura", sys.argv[1])
