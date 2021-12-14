TARGET = get_raw_data for_calibration human_detector

SRCDIR = ../../../../urg-lib/src
URG_CPP_LIB = ../../../../urg-lib/src/liburg_cpp.a

include ../../../../urg-lib/build_rule.mk

CXXFLAGS = -Wall -O2 -std=c++11 -fopenmp $(INCLUDES) -I/usr/local/include/urg_cpp 
LDLIBS = -lyaml-cpp -lm $(shell if test `echo $(OS) | grep Windows`; then echo "-lwsock32 -lsetupapi"; else if test `uname -s | grep Darwin`; then echo ""; else echo "-lrt"; fi; fi) -L$(SRCDIR)

#

all : $(TARGET)

clean :
	$(RM) *.o $(TARGET) *.exe

$(TARGET) : Connection_information.o $(URG_CPP_LIB)

$(URG_CPP_LIB) :
	cd $(@D)/ && $(MAKE) $(@F)
